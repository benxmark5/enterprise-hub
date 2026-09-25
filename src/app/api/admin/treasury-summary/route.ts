// src/app/api/admin/treasury-summary/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

export async function GET() {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Config missing' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Treasury wallets (KES + USD side by side)
    const { data: treasuries, error: tErr } = await supabase
      .from('treasury_wallets')
      .select('id, currency, available_balance, reserved_for_withdrawals, updated_at')
      .order('currency');

    if (tErr) throw tErr;

    // Pending withdrawals count + total
       const { data: pending, error: pErr } = await supabase
      .from('withdrawal_requests')
      .select('id, amount, currency, status')
      .in('status', ['pending', 'approved', 'processing']);

    if (pErr) throw pErr;

    // Completed / failed / reversed counts (last 30 days)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recent, error: rErr } = await supabase
      .from('withdrawal_requests')
      .select('status, amount')
      .gte('created_at', since);
    if (rErr) throw rErr;

    // Aggregate
    const pendingCount = pending?.length ?? 0;
    const pendingTotal = (pending ?? []).reduce((s, w) => s + Number(w.amount || 0), 0);

    const byStatus = (status: string) =>
      (recent ?? []).filter(w => w.status === status).length;

    const completedTotal30d = (recent ?? [])
      .filter(w => w.status === 'paid')
      .reduce((s, w) => s + Number(w.amount.amount || 0), 0);

    const failedTotal30d = (recent ?? [])
      .filter(w => ['failed', 'rejected'].includes(w.status))
      .reduce((s, w) => s + Number(w.amount.amount || 0), 0);

    // Recent treasury movements (last 20) — for sparkline
    const { data: movements, error: mErr } = await supabase
      .from('treasury_transactions')
      .select('type, amount, currency, direction, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (mErr) throw mErr;

    return NextResponse.json({
      ok: true,
      treasuries: treasuries ?? [],
      pending: { count: pendingCount, total_usd: pendingTotal },
      last30d: {
        completed_count: byStatus('paid'),
        completed_total_usd: completedTotal30d,
        failed_count: byStatus('failed') + byStatus('rejected'),
        failed_total_usd: failedTotal30d,
        reversed_count: byStatus('reversed'),
      },
      recent_movements: movements ?? [],
      fetched_at: new Date().toISOString(),
    });
    } catch (err) {
    console.error('[treasury-summary] error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}