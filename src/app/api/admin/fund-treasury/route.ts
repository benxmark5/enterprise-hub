// src/app/api/admin/fund-treasury/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Config missing' }, { status: 500 });
    }

    // ── Auth ──
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
    const m = String(method || 'manual_record');

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum === 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    const cur = String(currency || 'KES').toUpperCase();
    if (!['KES', 'USD'].includes(cur)) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ── Path A: Manual Bank/M-Pesa transfer — VERIFY with Paystack first ──
    if (m === 'manual_record') {
      const ref = (reference || '').trim();
      if (!ref) {
        return NextResponse.json(
          { error: 'Paystack reference is required' },
          { status: 400 }
        );
      }
      if (!PAYSTACK_SECRET) {
        return NextResponse.json(
          { error: 'PAYSTACK_SECRET_KEY not configured' },
          { status: 500 }
        );
      }

      // Query Paystack to confirm the money is real
      const psRes = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }, cache: 'no-store' }
      );
      const psData = await psRes.json();

      if (!psRes.ok || !psData.status || psData.data?.status !== 'success') {
        const reason = psData.data?.status || psData.message || 'not found';
        return NextResponse.json(
          { error: `Paystack rejected this reference: ${reason}` },
          { status: 400 }
        );
      }

      const psAmount = Number(psData.data.amount) / 100;         // minor units → major
      const psCurrency = String(psData.data.currency || '').toUpperCase();

      if (psCurrency !== cur) {
        return NextResponse.json(
          { error: `Currency mismatch: Paystack shows ${psCurrency}, you entered ${cur}` },
          { status: 400 }
        );
      }

      if (Math.abs(psAmount - amountNum) > 0.01) {
        return NextResponse.json(
          {
            error: `Amount mismatch: Paystack shows ${psAmount.toFixed(2)} ${psCurrency}, you entered ${amountNum.toFixed(2)} ${cur}`,
          },
          { status: 400 }
        );
      }

      // Idempotency — don't double-credit the same reference
      const { data: existing } = await supabase
        .from('treasury_transactions')
        .select('id')
        .eq('reference', ref)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: 'This reference has already been recorded' },
          { status: 400 }
        );
      }

      // All checks passed — record it
      const { data: rpcResult, error: rpcErr } = await supabase.rpc('treasury_fund', {
        p_currency: cur,
        p_amount: amountNum,
        p_reference: ref,
        p_description:
          description?.trim() || `Verified Paystack transfer ${ref}`,
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
        verified: true,
      });
    }

    // ── Path B: Adjustment — manual, no Paystack check ──
    if (m === 'adjustment') {
      if (!description?.trim()) {
        return NextResponse.json(
          { error: 'Adjustment reason is required' },
          { status: 400 }
        );
      }

      // Allow negative adjustments (deductions)
      const rpcAmount = Math.abs(amountNum);
      const isDeduction = amountNum < 0;

      const { data: rpcResult, error: rpcErr } = await supabase.rpc('treasury_fund', {
        p_currency: cur,
        p_amount: isDeduction ? -rpcAmount : rpcAmount,
        p_reference: reference?.trim() || `ADJ_${Date.now()}`,
        p_description: `ADJUSTMENT: ${description.trim()}`,
        p_actor: user.email || user.id,
      });

      if (rpcErr) {
        return NextResponse.json({ error: rpcErr.message }, { status: 400 });
      }
      const r = rpcResult as { ok?: boolean; error?: string; new_balance?: number; txn_id?: string } | null;
      if (!r?.ok) {
        return NextResponse.json({ error: r?.error || 'Adjustment failed' }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        new_balance: r.new_balance,
        txn_id: r.txn_id,
        adjusted: true,
      });
    }

    return NextResponse.json({ error: `Unknown method: ${m}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}