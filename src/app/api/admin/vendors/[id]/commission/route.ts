// src/app/api/admin/vendors/[id]/commission/route.ts
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

// PATCH — update commission_config (percent, fixed_usd) + bump version + audit with reason
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const { admin, user } = await getAdminClient();
    const params = await context.params;
    const vendorId = params?.id;
    if (!vendorId) return NextResponse.json({ error: 'Missing vendor id' }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    const percentRaw = body?.percent;
    const fixedRaw   = body?.fixed_usd;
    const reason     = String(body?.reason ?? '').trim();

    // Validation
    const errs: string[] = [];
    if (percentRaw == null && fixedRaw == null) errs.push('percent or fixed_usd required');
    if (!reason) errs.push('reason is required');

    const percent = percentRaw != null ? Number(percentRaw) : 0;
    const fixed   = fixedRaw   != null ? Number(fixedRaw)   : 0;

    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      errs.push('percent must be between 0 and 100');
    }
    if (!Number.isFinite(fixed) || fixed < 0) {
      errs.push('fixed_usd must be a non-negative number');
    }
    if (errs.length) return NextResponse.json({ error: errs.join('; ') }, { status: 400 });

    // Load current vendor
    const { data: vendor, error: vErr } = await admin
      .from('vendors')
      .select('id, commission_config')
      .eq('id', vendorId)
      .maybeSingle();
    if (vErr) throw vErr;
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });

    const prior = (vendor.commission_config ?? {}) as {
      percent?: number;
      fixed_usd?: number;
      version?: number;
    };
    const priorVersion = Number(prior.version ?? 0);
    const nextVersion = priorVersion + 1;

    const nextConfig = {
      percent,
      fixed_usd: fixed,
      version: nextVersion,
      updated_at: new Date().toISOString(),
      updated_by: user.email ?? 'admin',
      reason,
    };

    const { data: updated, error: uErr } = await admin
      .from('vendors')
      .update({ commission_config: nextConfig })
      .eq('id', vendorId)
      .select('id, commission_config')
      .single();
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    // Audit — piggyback on vendor_audit_log
    await admin.from('vendor_audit_log').insert({
      vendor_id: vendorId,
      action: 'commission_update',
      actor_id: user.id,
      actor_email: user.email ?? 'admin',
      detail: {
        before: {
          percent: prior.percent ?? 0,
          fixed_usd: prior.fixed_usd ?? 0,
          version: priorVersion,
        },
        after: {
          percent,
          fixed_usd: fixed,
          version: nextVersion,
        },
        reason,
      },
    });

    return NextResponse.json({ ok: true, commission_config: updated.commission_config });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    const status = message === 'Unauthorized' ? 401 : 500;
    if (status === 500) console.error('[commission PATCH] error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}