import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Helper to generate a crash point (House edge built-in, e.g., similar to Spribe formula)
function generateCrashPoint(): number {
  const e = 2 ** 32;
  const h = crypto.getRandomValues(new Uint32Array(1))[0];
  // 5% immediate crash chance (1.00x), otherwise scale up
  if (h % 20 === 0) return 1.00;
  const crash = Math.floor((100 * e - h) / (e - h)) / 100;
  return Math.max(1.01, crash);
}

export async function POST() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 1. Fetch latest round number
  const { data: latest } = await admin
    .from('game_rounds')
    .select('round_number')
    .order('round_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextRoundNumber = (latest?.round_number ?? 0) + 1;
  const crashPoint = generateCrashPoint();

  // 2. Set betting window (e.g., 10 seconds from now)
  const bettingEndsAt = new Date(Date.now() + 10000).toISOString();

  // 3. Insert new round into Supabase
  const { data, error } = await admin
    .from('game_rounds')
    .insert({
      round_number: nextRoundNumber,
      status: 'betting',
      betting_ends_at: bettingEndsAt,
      crash_point: crashPoint,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, round: data });
}