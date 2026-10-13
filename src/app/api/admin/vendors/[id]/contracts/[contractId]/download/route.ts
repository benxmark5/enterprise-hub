// src/app/api/admin/vendors/[id]/contracts/[contractId]/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

const BUCKET = 'vendor-kyc';

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

export async function GET(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const { admin } = await getAdminClient();
    const params = await context.params;
    const vendorId = params?.id;
    const contractId = params?.contractId;
    if (!vendorId || !contractId) return NextResponse.json({ error: 'Missing ids' }, { status: 400 });

    const url = new URL(req.url);
    const kind = url.searchParams.get('kind') || 'unsigned'; // unsigned | signed

    const { data: contract, error: cErr } = await admin
      .from('vendor_contracts')
      .select('unsigned_storage_path, signed_storage_path, unsigned_file_name, signed_file_name')
      .eq('id', contractId)
      .eq('vendor_id', vendorId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

    const storagePath = kind === 'signed' ? contract.signed_storage_path : contract.unsigned_storage_path;
    const fileName = kind === 'signed' ? contract.signed_file_name : contract.unsigned_file_name;

    if (!storagePath) {
      return NextResponse.json({ error: `No ${kind} file for this contract` }, { status: 404 });
    }

    const { data: signed, error: sErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 300); // 5 minutes
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });

    return NextResponse.json({
      ok: true,
      url: signed.signedUrl,
      file_name: fileName,
      expires_in: 300,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    const status = message === 'Unauthorized' ? 401 : 500;
    if (status === 500) console.error('[contracts download] error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}