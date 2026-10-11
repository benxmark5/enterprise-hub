// src/app/api/admin/marketers/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

export async function GET(req: NextRequest) {
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

    const url = new URL(req.url);
    const range = url.searchParams.get('range') || '30d'; // 7d | 30d | 90d | 12m | lifetime

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ----- 1. Status distribution (all marketers) -----
    const { data: allMarketers } = await admin
      .from('marketers')
      .select('id, status, display_name, referral_code, total_conversions, pending_earnings, created_at');

    const statusCounts = { pending: 0, approved: 0, rejected: 0, suspended: 0 };
    for (const m of allMarketers ?? []) {
      const s = String((m as { status: string }).status) as keyof typeof statusCounts;
      if (s in statusCounts) statusCounts[s]++;
    }
    const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));

    // ----- 2. Top marketers (bar) -----
    const topMarketers = [...(allMarketers ?? [])]
      .filter((m) => (m as { status: string }).status === 'approved')
      .sort((a, b) => Number((b as { total_conversions: number }).total_conversions ?? 0) - Number((a as { total_conversions: number }).total_conversions ?? 0))
      .slice(0, 5)
      .map((m) => ({
        name: (m as { display_name: string }).display_name,
        code: (m as { referral_code: string }).referral_code,
        conversions: Number((m as { total_conversions: number }).total_conversions ?? 0),
      }));

    // ----- 3. Signups over time (from referral_attributions) -----
    const now = new Date();
    const rangeStart = (() => {
      switch (range) {
        case '7d':  return new Date(now.getTime() - 7  * 86400_000);
        case '30d': return new Date(now.getTime() - 30 * 86400_000);
        case '90d': return new Date(now.getTime() - 90 * 86400_000);
        case '12m': return new Date(now.getTime() - 365 * 86400_000);
        default:    return null; // lifetime
      }
    })();

    let attrQuery = admin
      .from('referral_attributions')
      .select('clicked_at, converted_at')
      .order('clicked_at', { ascending: true });
    if (rangeStart) attrQuery = attrQuery.gte('clicked_at', rangeStart.toISOString());

    const { data: attrs } = await attrQuery;

    // Bucket by day
    const buckets = new Map<string, { clicks: number; signups: number }>();
    for (const a of attrs ?? []) {
      const row = a as { clicked_at: string; converted_at: string | null };
      const day = row.clicked_at.slice(0, 10);
      if (!buckets.has(day)) buckets.set(day, { clicks: 0, signups: 0 });
      const b = buckets.get(day)!;
      b.clicks++;
      if (row.converted_at) b.signups++;
    }
    const timeline = [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        label: date.slice(5), // MM-DD
        clicks: v.clicks,
        signups: v.signups,
      }));

    return NextResponse.json({
      ok: true,
      range,
      statusDistribution,
      topMarketers,
      timeline,
      totals: {
        clicks: timeline.reduce((s, r) => s + r.clicks, 0),
        signups: timeline.reduce((s, r) => s + r.signups, 0),
      },
    });
  } catch (err) {
    console.error('[admin/marketers/analytics] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}