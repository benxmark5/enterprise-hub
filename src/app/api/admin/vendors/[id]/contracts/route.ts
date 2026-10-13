// src/app/api/admin/vendors/[id]/contracts/route.ts
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

// GET — list contracts for vendor (newest version first)
export async function GET(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const { admin } = await getAdminClient();
    const params = await context.params;
    const vendorId = params?.id;
    if (!vendorId) return NextResponse.json({ error: 'Missing vendor id' }, { status: 400 });

    const { data, error } = await admin
      .from('vendor_contracts')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('contract_version', { ascending: false });
    if (error) throw error;

    return NextResponse.json({ ok: true, contracts: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    const status = message === 'Unauthorized' ? 401 : 500;
    if (status === 500) console.error('[contracts GET] error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}

// POST — upload unsigned contract (creates new version, supersedes prior active)
export async function POST(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const { admin, user } = await getAdminClient();
    const params = await context.params;
    const vendorId = params?.id;
    if (!vendorId) return NextResponse.json({ error: 'Missing vendor id' }, { status: 400 });

    const form = await req.formData();
    const file = form.get('file');
    const contractType = String(form.get('contract_type') || 'master_agreement');
    const notes = String(form.get('notes') || '').trim() || null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF contracts are accepted' }, { status: 400 });
    }

    // Confirm vendor
    const { data: vendor } = await admin.from('vendors').select('id').eq('id', vendorId).maybeSingle();
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });

    // Determine next version number
    const { data: existing } = await admin
      .from('vendor_contracts')
      .select('contract_version')
      .eq('vendor_id', vendorId)
      .order('contract_version', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = (existing?.contract_version ?? 0) + 1;

    // Supersede any currently-active contract
    await admin
      .from('vendor_contracts')
      .update({ status: 'superseded' })
      .eq('vendor_id', vendorId)
      .in('status', ['sent_to_vendor', 'signed']);

    // Storage path
    const stamp = Date.now();
    const storagePath = `${vendorId}/contracts/unsigned-v${nextVersion}-${stamp}.pdf`;

    const arrayBuf = await file.arrayBuffer();
    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuf, {
        contentType: 'application/pdf',
        upsert: false,
      });
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 400 });

    const { data: row, error: insErr } = await admin
      .from('vendor_contracts')
      .insert({
        vendor_id: vendorId,
        contract_version: nextVersion,
        contract_type: contractType,
        generated_by: 'manual_upload',
        unsigned_storage_path: storagePath,
        unsigned_file_name: file.name,
        unsigned_mime_type: file.type,
        unsigned_file_size: file.size,
        unsigned_uploaded_at: new Date().toISOString(),
        unsigned_uploaded_by: user.id,
        status: 'draft',
        notes,
      })
      .select('*')
      .single();

    if (insErr) {
      await admin.storage.from(BUCKET).remove([storagePath]);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    await admin.from('vendor_audit_log').insert({
      vendor_id: vendorId,
      action: 'contract_upload',
      actor_id: user.id,
      actor_email: user.email ?? 'admin',
      detail: {
        contract_id: row.id,
        version: nextVersion,
        file_name: file.name,
      },
    });

    return NextResponse.json({ ok: true, contract: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    const status = message === 'Unauthorized' ? 401 : 500;
    if (status === 500) console.error('[contracts POST] error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}