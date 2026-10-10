// src/app/api/admin/marketers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Config missing' }, { status: 500 });
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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: marketer, error: mErr } = await admin
      .from('marketers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (mErr) throw mErr;
    if (!marketer) return NextResponse.json({ error: 'Marketer not found' }, { status: 404 });

    const [attrsRes, convsRes, payoutsRes, historyRes] = await Promise.all([
      admin
        .from('referral_attributions')
        .select('*')
        .eq('marketer_id', id)
        .order('clicked_at', { ascending: false })
        .limit(100),
      admin
        .from('marketer_conversions')
        .select('*')
        .eq('marketer_id', id)
        .order('created_at', { ascending: false })
        .limit(200),
      admin
        .from('marketer_payouts')
        .select('*')
        .eq('marketer_id', id)
        .order('created_at', { ascending: false }),
      admin
        .from('marketer_status_history')
        .select('*')
        .eq('marketer_id', id)
        .order('created_at', { ascending: false }),
    ]);

    const conversions = convsRes.data ?? [];
    const totalSignups = conversions.filter(c => c.conversion_type === 'signup').length;
    const totalPurchases = conversions.filter(c => c.conversion_type === 'first_purchase').length;
    const totalPurchaseVolume = conversions
      .filter(c => c.conversion_type === 'first_purchase')
      .reduce((sum, c) => sum + Number(c.amount_usd || 0), 0);
    const totalCommissionEarned = conversions.reduce(
      (sum, c) => sum + Number(c.commission_usd || 0),
      0
    );

    const payouts = payoutsRes.data ?? [];
    const totalPaid = payouts
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount_usd || 0), 0);
    const pendingPayouts = payouts
      .filter(p => p.status === 'pending' || p.status === 'approved')
      .reduce((sum, p) => sum + Number(p.amount_usd || 0), 0);

    return NextResponse.json({
      ok: true,
      marketer,
      stats: {
        totalSignups,
        totalPurchases,
        totalPurchaseVolume,
        totalCommissionEarned,
        totalPaid,
        pendingPayouts,
        totalClicks: (attrsRes.data ?? []).length,
      },
      attributions: attrsRes.data ?? [],
      conversions,
      payouts,
      history: historyRes.data ?? [],
    });
  } catch (err) {
    console.error('[admin/marketers/:id] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}