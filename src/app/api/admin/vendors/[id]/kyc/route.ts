// src/app/api/admin/vendors/[id]/kyc/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

const BUCKET = 'vendor-kyc';
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const ALLOWED_DOC_TYPES = new Set([
  'national_id',
  'passport',
  'business_registration',
  'tax_id',
  'proof_of_address',
]);

const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Config missing' }, { status: 500 });
    }

    // Auth
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
    if (!vendorId) return NextResponse.json({ error: 'Missing vendor id' }, { status: 400 });

    // Parse multipart
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
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, JPEG, PNG' },
        { status: 400 }
      );
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Confirm vendor exists
    const { data: vendor, error: vErr } = await admin
      .from('vendors')
      .select('id')
      .eq('id', vendorId)
      .maybeSingle();
    if (vErr) throw vErr;
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });

    // Build a safe, unique storage path
    const ext = EXT_BY_MIME[file.type] ?? 'bin';
    const stamp = Date.now();
    const safeName = `${docType}-${stamp}.${ext}`;
    const storagePath = `${vendorId}/${safeName}`;

    // Upload to storage
    const arrayBuf = await file.arrayBuffer();
    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuf, {
        contentType: file.type,
        upsert: false,
      });
    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 400 });
    }

    // Insert metadata row
    const { data: docRow, error: insErr } = await admin
      .from('vendor_kyc_documents')
      .insert({
        vendor_id: vendorId,
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
      // Roll back storage if the metadata insert fails
      await admin.storage.from(BUCKET).remove([storagePath]);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, doc: docRow });
  } catch (err) {
    console.error('[admin/vendors/:id/kyc POST] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}