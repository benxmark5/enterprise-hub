// src/app/api/admin/vendors/[id]/contracts/[contractId]/upload-signed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

const BUCKET = 'vendor-kyc';
const MAX_SIZE = 10 * 1024 * 1024;

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

    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF is accepted' }, { status: 400 });
    }

    const { data: contract, error: cErr } = await admin
      .from('vendor_contracts')
      .select('id, contract_version, status')
      .eq('id', contractId)
      .eq('vendor_id', vendorId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    if (contract.status === 'superseded' || contract.status === 'voided') {
      return NextResponse.json({ error: `Cannot upload to a ${contract.status} contract` }, { status: 400 });
    }

    const stamp = Date.now();
    const storagePath = `${vendorId}/contracts/signed-v${contract.contract_version}-${stamp}.pdf`;

    const arrayBuf = await file.arrayBuffer();
    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuf, { contentType: 'application/pdf', upsert: false });
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 400 });

    const { data: updated, error: uErr } = await admin
      .from('vendor_contracts')
      .update({
        signed_storage_path: storagePath,
        signed_file_name: file.name,
        signed_mime_type: file.type,
        signed_file_size: file.size,
        signed_uploaded_at: new Date().toISOString(),
        signed_uploaded_by: user.id,
        status: 'sent_to_vendor', // becomes signed after /sign runs
      })
      .eq('id', contractId)
      .eq('vendor_id', vendorId)
      .select('*')
      .single();
    if (uErr) {
      await admin.storage.from(BUCKET).remove([storagePath]);
      return NextResponse.json({ error: uErr.message }, { status: 500 });
    }

    await admin.from('vendor_audit_log').insert({
      vendor_id: vendorId,
      action: 'contract_signed_upload',
      actor_id: user.id,
      actor_email: user.email ?? 'admin',
      detail: { contract_id: contractId, file_name: file.name },
    });

    return NextResponse.json({ ok: true, contract: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    const status = message === 'Unauthorized' ? 401 : 500;
    if (status === 500) console.error('[contracts upload-signed] error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}