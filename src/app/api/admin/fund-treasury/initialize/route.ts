// src/app/api/admin/fund-treasury/initialize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
const APP_URL = process.env.APP_URL || 'https://enterprise-hub-phi.vercel.app';

export async function POST(req: NextRequest) {
  try {
    if (!PAYSTACK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Config missing' }, { status: 500 });
    }

        const cookieStore = await cookies();
    const authClient = createServerClient(
      SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // ignore — response already committed
            }
          },
        },
      }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const amount = Number(body?.amount);
    const currency = String(body?.currency || 'KES').toUpperCase();

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    if (!['KES', 'USD'].includes(currency)) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
    }

    const amountMinor = Math.round(amount * 100);
    const reference = 'TREAS_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const callbackUrl = APP_URL + '/admin/treasury?funded=1&ref=' + reference;

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + PAYSTACK_SECRET,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountMinor,
        currency,
        reference,
        callback_url: callbackUrl,
        metadata: {
          purpose: 'treasury_funding',
          adminId: user.id,
          adminEmail: user.email,
          amount: amount,
          currency,
        },
      }),
    });

    const data = await res.json();
    if (!data.status) {
      return NextResponse.json(
        { error: data.message || 'Paystack init failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      authorization_url: data.data?.authorization_url,
      reference,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
