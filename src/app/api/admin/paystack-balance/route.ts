// src/app/api/admin/paystack-balance/route.ts
import { NextResponse } from 'next/server';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

export async function GET() {
  try {
    if (!PAYSTACK_SECRET) {
      return NextResponse.json({
        ok: false,
        unavailable: true,
        reason: 'PAYSTACK_SECRET_KEY not configured',
      });
    }

    const res = await fetch('https://api.paystack.co/balance', {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      cache: 'no-store',
    });

    const data = await res.json();

    if (!res.ok || !data.status) {
      return NextResponse.json({
        ok: false,
        unavailable: true,
        reason: data?.message || `Paystack returned ${res.status}`,
      });
    }

    // Paystack returns an array of balances per currency
    const balances = (data.data ?? []) as Array<{ currency: string; balance: number }>;

    return NextResponse.json({
      ok: true,
      balances: balances.map(b => ({
        currency: b.currency,
        balance_minor: b.balance,
        balance: b.balance / 100, // convert minor → major
      })),
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      unavailable: true,
      reason: err instanceof Error ? err.message : 'Unknown',
    });
  }
}