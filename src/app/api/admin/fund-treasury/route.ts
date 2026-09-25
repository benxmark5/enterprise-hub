// src/app/api/admin/fund-treasury/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Config missing' }, { status: 500 });
    }

    // ── Auth: require signed-in admin ──
    const cookieStore = await cookies();
    const authClient = createServerClient(
      SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { amount, currency, reference, description, method } = body ?? {};

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    const cur = String(currency || 'KES').toUpperCase();
    if (!['KES', 'USD'].includes(cur)) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: rpcResult, error: rpcErr } = await supabase.rpc('treasury_fund', {
      p_currency: cur,
      p_amount: amountNum,
      p_reference: reference || `FUND_${Date.now()}`,
      p_description: description || `Treasury funding via ${method || 'manual'}`,
      p_actor: user.email || user.id,
    });

    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 400 });
    }

    const r = rpcResult as { ok?: boolean; error?: string; new_balance?: number; txn_id?: string } | null;
    if (!r?.ok) {
      return NextResponse.json({ error: r?.error || 'Funding failed' }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      new_balance: r.new_balance,
      txn_id: r.txn_id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}