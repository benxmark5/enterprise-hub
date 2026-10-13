// src/app/api/admin/vendors/[id]/bank-accounts/[bankId]/route.ts
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

// PATCH — update fields (and/or promote to primary)
export async function PATCH(
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

    const patch: Record<string, unknown> = {};
    if (body.bank_name != null)      patch.bank_name = String(body.bank_name).trim();
    if (body.account_holder != null) patch.account_holder = String(body.account_holder).trim();
    if (body.account_number != null) patch.account_number = String(body.account_number).trim();
    if (body.branch_code != null)    patch.branch_code = String(body.branch_code).trim() || null;
    if (body.swift_bic != null)      patch.swift_bic = String(body.swift_bic).trim() || null;
    if (body.iban != null)           patch.iban = String(body.iban).trim() || null;
    if (body.country != null)        patch.country = String(body.country).trim();
    if (body.currency != null)       patch.currency = String(body.currency).trim();

    // Editing financial fields invalidates verification — force re-verify
    const financialTouched =
      patch.account_number !== undefined ||
      patch.account_holder !== undefined ||
      patch.bank_name !== undefined ||
      patch.iban !== undefined ||
      patch.swift_bic !== undefined;
    if (financialTouched) {
      patch.verification_status = 'unverified';
      patch.verified_at = null;
      patch.verified_by = null;
    }

    // Handle primary toggle
    if (body.is_primary === true) {
      await admin
        .from('vendor_bank_accounts')
        .update({ is_primary: false })
        .eq('vendor_id', vendorId)
        .is('deleted_at', null)
        .eq('is_primary', true)
        .neq('id', bankId);
      patch.is_primary = true;
    } else if (body.is_primary === false) {
      patch.is_primary = false;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: row, error } = await admin
      .from('vendor_bank_accounts')
      .update(patch)
      .eq('id', bankId)
      .eq('vendor_id', vendorId)
      .is('deleted_at', null)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await admin.from('vendor_audit_log').insert({
      vendor_id: vendorId,
      action: 'bank_account_update',
      actor_id: user.id,
      actor_email: user.email ?? 'admin',
      detail: { bank_id: bankId, patch: { ...patch, account_number: undefined } },
    });

    return NextResponse.json({ ok: true, account: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    const status = message === 'Unauthorized' ? 401 : 500;
    if (status === 500) console.error('[bank-accounts PATCH] error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE — soft delete
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const { admin, user } = await getAdminClient();
    const params = await context.params;
    const vendorId = params?.id;
    const bankId = params?.bankId;
    if (!vendorId || !bankId) return NextResponse.json({ error: 'Missing ids' }, { status: 400 });

    const { data: row, error } = await admin
      .from('vendor_bank_accounts')
      .update({ deleted_at: new Date().toISOString(), is_primary: false })
      .eq('id', bankId)
      .eq('vendor_id', vendorId)
      .is('deleted_at', null)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await admin.from('vendor_audit_log').insert({
      vendor_id: vendorId,
      action: 'bank_account_delete',
      actor_id: user.id,
      actor_email: user.email ?? 'admin',
      detail: { bank_id: bankId, bank_name: row.bank_name, account_number_last4: String(row.account_number).slice(-4) },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    const status = message === 'Unauthorized' ? 401 : 500;
    if (status === 500) console.error('[bank-accounts DELETE] error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}