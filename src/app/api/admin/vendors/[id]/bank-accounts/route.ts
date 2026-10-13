// src/app/api/admin/vendors/[id]/bank-accounts/route.ts
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

// POST — create a new bank account for the vendor
export async function POST(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const { admin, user } = await getAdminClient();
    const params = await context.params;
    const vendorId = params?.id;
    if (!vendorId) return NextResponse.json({ error: 'Missing vendor id' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const bank_name      = String(body?.bank_name ?? '').trim();
    const account_holder = String(body?.account_holder ?? '').trim();
    const account_number = String(body?.account_number ?? '').trim();
    const branch_code    = body?.branch_code ? String(body.branch_code).trim() : null;
    const swift_bic      = body?.swift_bic ? String(body.swift_bic).trim() : null;
    const iban           = body?.iban ? String(body.iban).trim() : null;
    const country        = String(body?.country ?? 'ZW').trim();
    const currency       = String(body?.currency ?? 'USD').trim();
    const is_primary     = Boolean(body?.is_primary);

    const errs: string[] = [];
    if (!bank_name)      errs.push('bank_name required');
    if (!account_holder) errs.push('account_holder required');
    if (!account_number) errs.push('account_number required');
    if (errs.length) return NextResponse.json({ error: errs.join('; ') }, { status: 400 });

    // Confirm vendor exists
    const { data: vendor } = await admin.from('vendors').select('id').eq('id', vendorId).maybeSingle();
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });

    // Single-primary rule: demote others if this one is being made primary
    if (is_primary) {
      await admin
        .from('vendor_bank_accounts')
        .update({ is_primary: false })
        .eq('vendor_id', vendorId)
        .is('deleted_at', null)
        .eq('is_primary', true);
    }

    const { data: row, error: insErr } = await admin
      .from('vendor_bank_accounts')
      .insert({
        vendor_id: vendorId,
        bank_name, account_holder, account_number,
        branch_code, swift_bic, iban, country, currency,
        is_primary,
        verification_status: 'unverified',
      })
      .select('*')
      .single();
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    await admin.from('vendor_audit_log').insert({
      vendor_id: vendorId,
      action: 'bank_account_add',
      actor_id: user.id,
      actor_email: user.email ?? 'admin',
      detail: { bank_name, account_holder, account_number_last4: account_number.slice(-4), is_primary },
    });

    return NextResponse.json({ ok: true, account: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    const status = message === 'Unauthorized' ? 401 : 500;
    if (status === 500) console.error('[bank-accounts POST] error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}

// GET — list non-deleted accounts for the vendor
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
      .from('vendor_bank_accounts')
      .select('*')
      .eq('vendor_id', vendorId)
      .is('deleted_at', null)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json({ ok: true, accounts: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    const status = message === 'Unauthorized' ? 401 : 500;
    if (status === 500) console.error('[bank-accounts GET] error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}