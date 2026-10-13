// src/app/api/admin/settings/company-remittance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

// ─── helpers ────────────────────────────────────────────────

async function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Config missing');
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
  if (!user) throw new Error('Unauthorized');

  return {
    admin: createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY),
    user,
  };
}

// ─── GET: return the active row (or null) ──────────────────

export async function GET() {
  try {
    const { admin } = await getAdminClient();

    const { data, error } = await admin
      .from('company_remittance_details')
      .select('*')
      .order('is_active', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ ok: true, row: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    const status = message === 'Unauthorized' ? 401 : 500;
    if (status === 500) console.error('[admin/settings/company-remittance GET] error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}

// ─── POST: upsert (deactivates prior active row) + audit ──

export async function POST(req: NextRequest) {
  try {
    const { admin, user } = await getAdminClient();

    const body = await req.json().catch(() => ({}));

    // Basic validation
    const bank_name      = String(body?.bank_name ?? '').trim();
    const account_holder = String(body?.account_holder ?? '').trim();
    const account_number = String(body?.account_number ?? '').trim();
    const country        = String(body?.country ?? 'ZW').trim();
    const currency       = String(body?.currency ?? 'USD').trim();
    const swift_bic      = body?.swift_bic ? String(body.swift_bic).trim() : null;
    const branch_code    = body?.branch_code ? String(body.branch_code).trim() : null;
    const reference_template = body?.reference_template ? String(body.reference_template).trim() : null;

    const errors: string[] = [];
    if (!bank_name)      errors.push('bank_name is required');
    if (!account_holder) errors.push('account_holder is required');
    if (!account_number) errors.push('account_number is required');
    if (!country)        errors.push('country is required');
    if (!currency)       errors.push('currency is required');
    if (errors.length) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
    }

    // Read prior active row for the audit trail
    const { data: prior } = await admin
      .from('company_remittance_details')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    // Deactivate any existing active row
    await admin
      .from('company_remittance_details')
      .update({ is_active: false })
      .eq('is_active', true);

    // Insert new active row
    const { data: inserted, error: insErr } = await admin
      .from('company_remittance_details')
      .insert({
        bank_name,
        account_holder,
        account_number,
        country,
        currency,
        swift_bic,
        branch_code,
        reference_template,
        is_active: true,
        verification_status: 'unverified',
        updated_by: user.id,
        updated_by_email: user.email ?? 'admin',
      })
      .select('*')
      .single();

    if (insErr) {
      // Rollback: reactivate prior row if we deactivated it
      if (prior) {
        await admin
          .from('company_remittance_details')
          .update({ is_active: true })
          .eq('id', prior.id);
      }
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    // Audit — piggyback on vendor_audit_log (vendor_id NULL for company-wide changes)
    await admin.from('vendor_audit_log').insert({
      vendor_id: null,
      action: 'company_remittance_update',
      actor_id: user.id,
      actor_email: user.email ?? 'admin',
      detail: {
        before: prior ? {
          bank_name: prior.bank_name,
          account_holder: prior.account_holder,
          account_number_last4: String(prior.account_number).slice(-4),
        } : null,
        after: {
          bank_name: inserted.bank_name,
          account_holder: inserted.account_holder,
          account_number_last4: String(inserted.account_number).slice(-4),
        },
      },
    });

    return NextResponse.json({ ok: true, row: inserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    const status = message === 'Unauthorized' ? 401 : 500;
    if (status === 500) console.error('[admin/settings/company-remittance POST] error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}