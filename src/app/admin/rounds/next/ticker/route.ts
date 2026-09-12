import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const now = new Date();

  // 1. Fetch dynamic settings configured in the admin panel
  const { data: settings } = await admin
    .from('game_settings')
    .select('*')
    .eq('id', 1)
    .single();

  const roundDuration = settings?.round_duration ?? 30; // seconds the plane flies
  const roundInterval = settings?.round_interval ?? 5; // seconds for betting window
  const houseEdge = settings?.house_edge ?? 5;

  // 2. Check if we need to auto-create a new round if none is active
  const { data: activeRound } = await admin
    .from('game_rounds')
    .select('*')
    .in('status', ['betting', 'running'])
    .order('round_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!activeRound) {
    // Get latest round number to increment
    const { data: latest } = await admin
      .from('game_rounds')
      .select('round_number')
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextRoundNumber = (latest?.round_number ?? 0) + 1;
    
    // Generate crash point accounting for house edge
    const e = 2 ** 32;
    const h = crypto.getRandomValues(new Uint32Array(1))[0];
    const crashPoint = h % (100 / houseEdge) === 0 ? 1.00 : Math.max(1.01, Math.floor((100 * e - h) / (e - h)) / 100);

    const bettingEndsAt = new Date(now.getTime() + roundInterval * 1000).toISOString();

    await admin.from('game_rounds').insert({
      round_number: nextRoundNumber,
      status: 'betting',
      betting_ends_at: bettingEndsAt,
      crash_point: crashPoint,
    });
  } else {
    // 3. Transition 'betting' -> 'running'
    if (activeRound.status === 'betting' && activeRound.betting_ends_at && new Date(activeRound.betting_ends_at) <= now) {
      await admin
        .from('game_rounds')
        .update({
          status: 'running',
          running_started_at: now.toISOString(),
        })
        .eq('id', activeRound.id);
    }

    // 4. Transition 'running' -> 'crashed' based on elapsed time or crash point
    if (activeRound.status === 'running' && activeRound.running_started_at) {
      const elapsedSeconds = (now.getTime() - new Date(activeRound.running_started_at).getTime()) / 1000;
      const GROWTH_RATE = 0.17;
      const currentMultiplier = Math.exp(GROWTH_RATE * elapsedSeconds);

      if (elapsedSeconds >= roundDuration || currentMultiplier >= activeRound.crash_point) {
        await admin
          .from('game_rounds')
          .update({ status: 'crashed' })
          .eq('id', activeRound.id);
      }
    }
  }

  return NextResponse.json({ success: true, timestamp: now.toISOString() });
}