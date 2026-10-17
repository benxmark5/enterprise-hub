// src/app/api/admin/providers/[id]/kyc/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

const BUCKET = 'provider-kyc';
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const ALLOWED_DOC_TYPES = new Set([
  'national_id_front',
  'national_id_back',
  'passport',
  'proof_of_address',
  'business_registration',
  'tax_id',
]);

const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

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

// GET — list KYC docs for the provider application
export async function GET(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const { admin } = await getAdmin();
    const params = await context.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Missing provider id' }, { status: 400 });

    const { data, error } = await admin
      .from('provider_kyc_documents')
      .select('*')
      .eq('provider_application_id', id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json({ ok: true, documents: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    const status = message === 'Unauthorized' ? 401 : 500;
    if (status === 500) console.error('[admin/providers/:id/kyc GET] error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}

// POST — admin uploads a doc on behalf of applicant (multipart)
export async function POST(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const { admin, user } = await getAdmin();
    const params = await context.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Missing provider id' }, { status: 400 });

    const form = await req.formData();
    const docType = String(form.get('doc_type') || '');
    const file = form.get('file');

    if (!ALLOWED_DOC_TYPES.has(docType)) {
      return NextResponse.json(
        { error: `Invalid doc_type. Allowed: ${[...ALLOWED_DOC_TYPES].join(', ')}` },
        { status: 400 }
      );
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: PDF, JPEG, PNG' }, { status: 400 });
    }

    // Confirm application exists + get applicant user_id
    const { data: app, error: aErr } = await admin
      .from('provider_applications')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!app) return NextResponse.json({ error: 'Provider application not found' }, { status: 404 });

    // Build storage path: <user_id>/<application_id>/<doc_type>-<ts>.<ext>
    const ownerId = app.user_id ?? 'admin-upload';
    const ext = EXT_BY_MIME[file.type] ?? 'bin';
    const stamp = Date.now();
    const storagePath = `${ownerId}/${id}/${docType}-${stamp}.${ext}`;

    const arrayBuf = await file.arrayBuffer();
    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuf, { contentType: file.type, upsert: false });
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 400 });

    const { data: docRow, error: insErr } = await admin
      .from('provider_kyc_documents')
      .insert({
        provider_application_id: id,
        user_id: app.user_id,
        doc_type: docType,
        status: 'pending',
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
      })
      .select('*')
      .single();

    if (insErr) {
      await admin.storage.from(BUCKET).remove([storagePath]);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    // Audit
    await admin.from('provider_kyc_audit').insert({
      doc_id: docRow.id,
      provider_application_id: id,
      action: 'uploaded',
      actor_id: user.id,
      actor_email: user.email ?? 'admin',
      detail: { doc_type: docType, file_name: file.name, size: file.size },
    });

    // Activity feed
    try {
      await admin.from('activity_feed').insert({
        type: 'provider_kyc_upload',
        title: '📎 KYC document uploaded',
        description: `Admin uploaded ${docType.replace(/_/g, ' ')} for provider application`,
        country: 'ZW',
        country_flag: '📎',
        metadata: { provider_application_id: id, doc_type: docType },
      });
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true, document: docRow });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    const status = message === 'Unauthorized' ? 401 : 500;
    if (status === 500) console.error('[admin/providers/:id/kyc POST] error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}