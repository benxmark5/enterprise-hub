// src/app/api/admin/vendors/[id]/kyc/[docId]/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

const BUCKET = 'vendor-kyc';

export async function GET(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Config missing' }, { status: 500 });
    }

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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = await context.params;
    const vendorId = params?.id;
    const docId = params?.docId;
    if (!vendorId || !docId) return NextResponse.json({ error: 'Missing ids' }, { status: 400 });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: doc, error: dErr } = await admin
      .from('vendor_kyc_documents')
      .select('storage_path, file_name')
      .eq('id', docId)
      .eq('vendor_id', vendorId)
      .maybeSingle();
    if (dErr) throw dErr;
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const { data: signed, error: sErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 300); // 5 minutes
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });

    return NextResponse.json({
      ok: true,
      url: signed.signedUrl,
      file_name: doc.file_name,
      expires_in: 300,
    });
  } catch (err) {
    console.error('[admin/vendors/:id/kyc/:docId/download] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}