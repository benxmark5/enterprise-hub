// src/app/api/admin/trigger-payout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
const ADMIN_SECRET = process.env.ADMIN_TO_PUBLIC_SECRET;
const PUBLIC_API = process.env.NEXT_PUBLIC_APP_URL?.includes('globalhub-eta')
  ? process.env.NEXT_PUBLIC_APP_URL
  : 'https://globalhub-eta.vercel.app';

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ADMIN_SECRET) {
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
    const withdrawalId = String(body?.withdrawal_id || '');
    if (!withdrawalId) {
      return NextResponse.json({ error: 'withdrawal_id required' }, { status: 400 });
    }

    // ── Forward to public's pay-withdrawal endpoint ──
    const res = await fetch(`${PUBLIC_API}/api/admin/pay-withdrawal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': ADMIN_SECRET,
      },
      body: JSON.stringify({ withdrawal_id: withdrawalId }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || 'Payout failed', ...data },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}