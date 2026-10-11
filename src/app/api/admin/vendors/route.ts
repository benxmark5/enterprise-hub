// src/app/api/admin/vendors/route.ts
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
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      q = q.eq('status', statusFilter);
    }

    const { data, error } = await q;
    if (error) throw error;

    const { data: allRows } = await admin
      .from('vendors')
      .select('status, total_collected_usd, total_remitted_usd, outstanding_usd');

    const counts = {
      application_started: 0,
      documents_submitted: 0,
      under_review: 0,
      info_required: 0,
      approved: 0,
      suspended: 0,
      rejected: 0,
      total: 0,
    };
    let totalCollected = 0;
    let totalRemitted = 0;
    let totalOutstanding = 0;

    for (const r of allRows ?? []) {
      const row = r as {
        status: string;
        total_collected_usd: number | null;
        total_remitted_usd: number | null;
        outstanding_usd: number | null;
      };
      const s = String(row.status);
      if (s in counts) (counts as Record<string, number>)[s]++;
      counts.total++;
      totalCollected += Number(row.total_collected_usd ?? 0);
      totalRemitted += Number(row.total_remitted_usd ?? 0);
      totalOutstanding += Number(row.outstanding_usd ?? 0);
    }

    return NextResponse.json({
      ok: true,
      vendors: data ?? [],
      counts,
      totals: {
        collected: totalCollected,
        remitted: totalRemitted,
        outstanding: totalOutstanding,
      },
    });
  } catch (err) {
    console.error('[admin/vendors] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}