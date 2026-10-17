// src/app/api/admin/providers/[id]/kyc/[docId]/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

async function getAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error('Config missing');
  const cookieStore = await cookies();
  const authClient = createServerClient(
    SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cs) {
          try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* ignore */ }
        },
      },
    }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return { admin: createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY), user };
}

// POST — mark KYC doc verified (or reset to unverified)
export async function POST(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const { admin, user } = await getAdmin();
    const params = await context.params;
    const id = params?.id;
    const docId = params?.docId;
    if (!id || !docId) return NextResponse.json({ error: 'Missing ids' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const next = String(body?.status ?? 'verified').toLowerCase();
    if (!['verified', 'pending'].includes(next)) {
      return NextResponse.json({ error: 'Status must be "verified" or "pending"' }, { status: 400 });
    }

    // Load current doc (must belong to this application)
    const { data: doc, error: dErr } = await admin
      .from('provider_kyc_documents')
      .select('id, doc_type, status')
      .eq('id', docId)
      .eq('provider_application_id', id)
      .maybeSingle();
    if (dErr) throw dErr;
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const now = new Date().toISOString();
    const { data: updated, error: uErr } = await admin
      .from('provider_kyc_documents')
      .update({
        status: next,
        reviewed_by: next === 'verified' ? user.id : null,
        reviewed_at: next === 'verified' ? now : null,
        rejection_note: null,
      })
      .eq('id', docId)
      .eq('provider_application_id', id)
      .select('*')
      .single();
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    // Audit
    await admin.from('provider_kyc_audit').insert({
      doc_id: docId,
      provider_application_id: id,
      action: next === 'verified' ? 'verified' : 'reset',
      actor_id: user.id,
      actor_email: user.email ?? 'admin',
      detail: { doc_type: doc.doc_type, from_status: doc.status, to_status: next },
    });

    // Activity feed
    try {
      await admin.from('activity_feed').insert({
        type: next === 'verified' ? 'provider_kyc_verified' : 'provider_kyc_reset',
        title: next === 'verified' ? '✅ KYC document verified' : '↺ KYC verification reset',
        description: `${String(doc.doc_type).replace(/_/g, ' ')} was marked ${next} by admin`,
        country: 'ZW',
        country_flag: next === 'verified' ? '✅' : '↺',
        metadata: { provider_application_id: id, doc_id: docId, doc_type: doc.doc_type },
      });
    } catch { /* non-fatal */ }

    // Auto-advance: if all required docs are verified → move application to under_review
    // (Best-effort — does not fail the request if it errors.)
    try {
      const { data: allDocs } = await admin
        .from('provider_kyc_documents')
        .select('doc_type, status')
        .eq('provider_application_id', id);

      const REQUIRED = ['national_id_front', 'national_id_back', 'proof_of_address'];
      const allRequiredPresent = REQUIRED.every(rt =>
        (allDocs ?? []).some(d => d.doc_type === rt)
      );
      const allRequiredVerified = REQUIRED.every(rt =>
        (allDocs ?? []).some(d => d.doc_type === rt && d.status === 'verified')
      );

      if (allRequiredPresent && allRequiredVerified) {
        const { data: app } = await admin
          .from('provider_applications')
          .select('status')
          .eq('id', id)
          .maybeSingle();
        if (app && app.status === 'pending') {
          await admin
            .from('provider_applications')
            .update({ status: 'under_review' })
            .eq('id', id);

          await admin.from('provider_kyc_audit').insert({
            doc_id: docId,
            provider_application_id: id,
            action: 'auto_advance_to_review',
            actor_id: user.id,
            actor_email: user.email ?? 'admin',
            detail: { reason: 'All required KYC docs verified' },
          });

          try {
            await admin.from('activity_feed').insert({
              type: 'provider_auto_review',
              title: '🔍 Application moved to review',
              description: 'All required KYC documents verified — application ready for final approval.',
              country: 'ZW',
              country_flag: '🔍',
              metadata: { provider_application_id: id },
            });
          } catch { /* non-fatal */ }
        }
      }
    } catch (advanceErr) {
      console.warn('[provider KYC verify] auto-advance skipped:', advanceErr);
    }

    return NextResponse.json({ ok: true, document: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    const status = message === 'Unauthorized' ? 401 : 500;
    if (status === 500) console.error('[admin/providers/:id/kyc/:docId/verify] error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}