// src/app/api/admin/vendors/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

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
    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: vendor, error: vErr } = await admin
      .from('vendors')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (vErr) throw vErr;
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });

    const [kycRes, bankRes, historyRes, auditRes] = await Promise.all([
      admin.from('vendor_kyc_documents').select('*').eq('vendor_id', id).order('created_at', { ascending: false }),
      admin.from('vendor_bank_accounts').select('*').eq('vendor_id', id).order('created_at', { ascending: false }),
      admin.from('vendor_status_history').select('*').eq('vendor_id', id).order('created_at', { ascending: false }),
      admin.from('vendor_audit_log').select('*').eq('vendor_id', id).order('created_at', { ascending: false }).limit(100),
    ]);

    return NextResponse.json({
      ok: true,
      vendor,
      kycDocuments: kycRes.data ?? [],
      bankAccounts: bankRes.data ?? [],
      history: historyRes.data ?? [],
      audit: auditRes.data ?? [],
    });
  } catch (err) {
    console.error('[admin/vendors/:id] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}