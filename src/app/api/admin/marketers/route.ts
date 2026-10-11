// src/app/api/admin/marketers/route.ts
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
    const statusFilter = url.searchParams.get('status') || 'all';

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    let q = admin
      .from('marketers')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      q = q.eq('status', statusFilter);
    }

    const { data, error } = await q;
    if (error) throw error;

    // Fetch full rowset for totals (small table, cheap)
    const { data: allRows } = await admin
      .from('marketers')
      .select('status, total_conversions, pending_earnings, total_paid');

    const counts = { pending: 0, approved: 0, rejected: 0, suspended: 0, total: 0 };
    let totalConversions = 0;
    let totalPendingEarnings = 0;
    let totalPaid = 0;

    for (const r of allRows ?? []) {
      const row = r as {
        status: string;
        total_conversions: number | null;
        pending_earnings: number | null;
        total_paid: number | null;
      };
      const s = String(row.status);
      if (s === 'pending') counts.pending++;
      else if (s === 'approved') counts.approved++;
      else if (s === 'rejected') counts.rejected++;
      else if (s === 'suspended') counts.suspended++;
      counts.total++;

      totalConversions += Number(row.total_conversions ?? 0);
      totalPendingEarnings += Number(row.pending_earnings ?? 0);
      totalPaid += Number(row.total_paid ?? 0);
    }

    return NextResponse.json({
      ok: true,
      marketers: data ?? [],
      counts,
      totals: {
        conversions: totalConversions,
        pendingEarnings: totalPendingEarnings,
        paid: totalPaid,
      },
    });
  } catch (err) {
    console.error('[admin/marketers] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}