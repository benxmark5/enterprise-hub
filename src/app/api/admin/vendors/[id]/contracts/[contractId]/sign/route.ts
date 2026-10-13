// src/app/api/admin/vendors/[id]/contracts/[contractId]/sign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

async function getAdminClient() {
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

const ALLOWED_METHODS = new Set(['wet_signature', 'email_acceptance', 'docusign', 'manual_upload']);

export async function POST(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const { admin, user } = await getAdminClient();
    const params = await context.params;
    const vendorId = params?.id;
    const contractId = params?.contractId;
    if (!vendorId || !contractId) return NextResponse.json({ error: 'Missing ids' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const signedByName = String(body?.signed_by_name ?? '').trim();
    const method = String(body?.signature_method ?? '').trim();
    const signedAt = body?.signed_at ? String(body.signed_at) : new Date().toISOString();
    const notes = body?.notes ? String(body.notes).trim() : null;

    if (!signedByName) return NextResponse.json({ error: 'signed_by_name is required' }, { status: 400 });
    if (!ALLOWED_METHODS.has(method)) {
      return NextResponse.json(
        { error: `signature_method must be one of: ${[...ALLOWED_METHODS].join(', ')}` },
        { status: 400 }
      );
    }

    // Load contract to confirm exists and belongs to vendor
    const { data: contract, error: cErr } = await admin
      .from('vendor_contracts')
      .select('id, status, signed_storage_path')
      .eq('id', contractId)
      .eq('vendor_id', vendorId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    if (contract.status === 'signed') {
      return NextResponse.json({ error: 'Contract already marked signed' }, { status: 400 });
    }
    if (contract.status === 'superseded' || contract.status === 'voided') {
      return NextResponse.json({ error: `Cannot sign a ${contract.status} contract` }, { status: 400 });
    }
    if (!contract.signed_storage_path) {
      return NextResponse.json({
        error: 'Upload the signed copy first using the upload-signed endpoint',
      }, { status: 400 });
    }

    const { data: updated, error: uErr } = await admin
      .from('vendor_contracts')
      .update({
        status: 'signed',
        signed_at: signedAt,
        signed_by_name: signedByName,
        signature_method: method,
        notes: notes ?? undefined,
      })
      .eq('id', contractId)
      .eq('vendor_id', vendorId)
      .select('*')
      .single();
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    // Update vendor's contract_signed_at
    await admin
      .from('vendors')
      .update({ contract_signed_at: signedAt })
      .eq('id', vendorId);

    await admin.from('vendor_audit_log').insert({
      vendor_id: vendorId,
      action: 'contract_signed',
      actor_id: user.id,
      actor_email: user.email ?? 'admin',
      detail: {
        contract_id: contractId,
        signed_by_name: signedByName,
        signature_method: method,
        signed_at: signedAt,
      },
    });

    return NextResponse.json({ ok: true, contract: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    const status = message === 'Unauthorized' ? 401 : 500;
    if (status === 500) console.error('[contracts sign] error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}