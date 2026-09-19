// src/app/aviator/api/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateSignals } from '@/lib/aviator/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ── INPUT ──
    // Two modes:
    //   1. Manual: { pattern: "4.35x 5.06x 1.70x ...", count, minConfidence }
    //   2. Auto:   { source: "auto", sampleSize?, count, minConfidence }
    const source: string = String(body?.source ?? 'manual').trim();
    const rawPattern: string = String(body?.pattern ?? '').trim();
    const explicitMultipliers = Array.isArray(body?.multipliers) ? body.multipliers : null;

    let multipliers: number[] = [];

    // ── AUTO: pull from game_rounds ──
    if (source === 'auto') {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return NextResponse.json(
          { success: false, error: 'Supabase not configured' },
          { status: 500 }
        );
      }
      const sampleSize = Math.max(20, Math.min(200, Number(body?.sampleSize ?? 50)));

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data: rounds, error: roundsErr } = await supabase
        .from('game_rounds')
        .select('crash_point, round_number')
        .eq('status', 'crashed')
        .not('crash_point', 'is', null)
        .order('round_number', { ascending: false })
        .limit(sampleSize);

      if (roundsErr) {
        return NextResponse.json(
          { success: false, error: `Failed to load rounds: ${roundsErr.message}` },
          { status: 500 }
        );
      }

      multipliers = (rounds ?? [])
        .map((r: { crash_point: number | string }) => Number(r.crash_point))
        .filter((m: number) => Number.isFinite(m) && m >= 1.0);
    }

    // ── MANUAL: parse pattern or use explicit array ──
    if (source !== 'auto' && multipliers.length === 0) {
      if (explicitMultipliers) {
        multipliers = explicitMultipliers
          .map((m: unknown) => Number(m))
          .filter((m: number) => Number.isFinite(m) && m >= 1.0);
      } else if (rawPattern) {
        multipliers = rawPattern
          .split(/\s+/)
          .map(token => token.replace(/x/i, '').trim())
          .filter(Boolean)
          .map(t => Number(t))
          .filter((m: number) => Number.isFinite(m) && m >= 1.0 && m <= 1000);
      }
    }

    if (multipliers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid multipliers to analyze.' },
        { status: 400 }
      );
    }

    // ── ADMIN OPTIONS ──
    const count = clampNum(Number(body?.count ?? 5), 2, 8);
    const minConfidence = clampNum(Number(body?.minConfidence ?? 60), 40, 95);

    // ── RUN ENGINE ──
    const result = generateSignals({
      multipliers,
      count,
      minConfidence,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      signals: result.signals,
      metadata: result.metadata,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Signal engine failed: ${msg}` },
      { status: 500 }
    );
  }
}

function clampNum(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}