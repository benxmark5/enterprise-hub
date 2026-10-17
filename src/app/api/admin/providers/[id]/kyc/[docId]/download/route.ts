// src/app/api/admin/providers/[id]/kyc/[docId]/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

const BUCKET = 'provider-kyc';

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

// GET — returns a 5-minute signed URL for the KYC doc
export async function GET(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const { admin, user } = await getAdmin();
    const params = await context.params;
    const id = params?.id;
    const docId = params?.docId;
    if (!id || !docId) return NextResponse.json({ error: 'Missing ids' }, { status: 400 });

    const { data: doc, error: dErr } = await admin
      .from('provider_kyc_documents')
      .select('storage_path, file_name, mime_type, provider_application_id')
      .eq('id', docId)
      .eq('provider_application_id', id)
      .maybeSingle();
    if (dErr) throw dErr;
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const { data: signed, error: sErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 300); // 5 minutes
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });

    // Audit — every admin view of a KYC document is recorded
    try {
      await admin.from('provider_kyc_audit').insert({
        doc_id: docId,
        provider_application_id: id,
        action: 'viewed',
        actor_id: user.id,
        actor_email: user.email ?? 'admin',
        detail: { file_name: doc.file_name },
      });
    } catch { /* non-fatal — audit failure must not block download */ }

    return NextResponse.json({
      ok: true,
      url: signed.signedUrl,
      file_name: doc.file_name,
      mime_type: doc.mime_type,
      expires_in: 300,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    const status = message === 'Unauthorized' ? 401 : 500;
    if (status === 500) console.error('[admin/providers/:id/kyc/:docId/download] error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}