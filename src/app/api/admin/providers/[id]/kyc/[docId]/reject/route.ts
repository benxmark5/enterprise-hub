// src/app/api/admin/providers/[id]/kyc/[docId]/reject/route.ts
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

// POST — reject a KYC doc with a reason (applicant will see it)
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
    const reason = String(body?.reason ?? '').trim();
    if (!reason) return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });

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
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: now,
        rejection_note: reason,
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
      action: 'rejected',
      actor_id: user.id,
      actor_email: user.email ?? 'admin',
      detail: { doc_type: doc.doc_type, from_status: doc.status, to_status: 'rejected', reason },
    });

    // Activity feed — visible to applicant
    try {
      await admin.from('activity_feed').insert({
        type: 'provider_kyc_rejected',
        title: '⚠️ KYC document needs correction',
        description: `${String(doc.doc_type).replace(/_/g, ' ')} was rejected. Please re-upload.`,
        country: 'ZW',
        country_flag: '⚠️',
        metadata: {
          provider_application_id: id,
          doc_id: docId,
          doc_type: doc.doc_type,
          reason,
        },
      });
    } catch { /* non-fatal */ }

    // If the application had been moved to 'under_review', push it back to 'pending'
    // so it shows up in the admin's pending queue for follow-up.
    try {
      const { data: app } = await admin
        .from('provider_applications')
        .select('status')
        .eq('id', id)
        .maybeSingle();
      if (app && app.status === 'under_review') {
        await admin
          .from('provider_applications')
          .update({ status: 'pending' })
          .eq('id', id);

        await admin.from('provider_kyc_audit').insert({
          doc_id: docId,
          provider_application_id: id,
          action: 'auto_revert_to_pending',
          actor_id: user.id,
          actor_email: user.email ?? 'admin',
          detail: { reason: 'A required KYC document was rejected' },
        });
      }
    } catch (revertErr) {
      console.warn('[provider KYC reject] revert skipped:', revertErr);
    }

    return NextResponse.json({ ok: true, document: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    const status = message === 'Unauthorized' ? 401 : 500;
    if (status === 500) console.error('[admin/providers/:id/kyc/:docId/reject] error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}