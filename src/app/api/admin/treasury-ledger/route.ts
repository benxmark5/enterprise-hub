// src/app/api/admin/treasury-ledger/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

export async function GET(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Config missing' }, { status: 500 });
    }

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);
    const type = url.searchParams.get('type');
    const currency = url.searchParams.get('currency');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    let q = supabase
      .from('treasury_transactions')
      .select('id, type, amount, currency, direction, reference, related_withdrawal_id, description, status, created_by, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type) q = q.eq('type', type);
    if (currency) q = q.eq('currency', currency);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}