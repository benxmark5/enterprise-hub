// src/app/api/admin/vendors/[id]/bank-accounts/[bankId]/verify/route.ts
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

export async function POST(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const { admin, user } = await getAdminClient();
    const params = await context.params;
    const vendorId = params?.id;
    const bankId = params?.bankId;
    if (!vendorId || !bankId) return NextResponse.json({ error: 'Missing ids' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const status = String(body?.status ?? 'verified').toLowerCase();
    if (!['verified', 'unverified', 'failed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Allowed: verified, unverified, failed' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data: row, error } = await admin
      .from('vendor_bank_accounts')
      .update({
        verification_status: status,
        verified_by: status === 'verified' ? user.id : null,
        verified_at: status === 'verified' ? now : null,
      })
      .eq('id', bankId)
      .eq('vendor_id', vendorId)
      .is('deleted_at', null)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await admin.from('vendor_audit_log').insert({
      vendor_id: vendorId,
      action: 'bank_account_verify',
      actor_id: user.id,
      actor_email: user.email ?? 'admin',
      detail: { bank_id: bankId, verification_status: status },
    });

    return NextResponse.json({ ok: true, account: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    const status = message === 'Unauthorized' ? 401 : 500;
    if (status === 500) console.error('[bank-accounts verify] error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}