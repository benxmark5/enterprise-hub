// src/lib/aviator/engine.ts
// Statistical signal generation engine for Aviator.
// Uses lognormal distribution fitting on historical crash points.

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
export interface EngineInput {
  /** Array of recent crash multipliers (e.g. [1.23, 4.50, 2.10, ...]). */
  multipliers: number[];
  /** How many signals to generate. Default 5. Clamped to [2, 8]. */
  count?: number;
  /** Minimum confidence to emit (0-100). Default 60. */
  minConfidence?: number;
}

export interface EngineSignal {
  entry_point: number;
  exit_point: number;
  confidence: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  signal_notes: string;
  suggested_price: number;
}

export interface EngineOutput {
  success: boolean;
  signals: EngineSignal[];
  metadata: {
    sample_size: number;
    median_crash: number;
    mu: number;         // lognormal mean
    sigma: number;      // lognormal std dev
    volatility: 'LOW' | 'MEDIUM' | 'HIGH';
    trend: 'RISING' | 'FALLING' | 'STABLE';
    generated_at: string;
  };
  error?: string;
}

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────
const MIN_SAMPLE = 10;
const MAX_SAMPLE = 200;
const SAFETY_FACTOR = 0.85; // recommended exit is 15% below predicted
const MIN_CONFIDENCE_HARD = 40; // never emit below this regardless of input
const MAX_EXIT_HARD = 1000; // effectively unlimited — the plane can fly as high as it wants

// ─────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────
export function generateSignals(input: EngineInput): EngineOutput {
   const {
    multipliers,
    count = 5,
    minConfidence = 60,
  } = input;

  // ── Validate input ──
  if (!Array.isArray(multipliers)) {
    return err('multipliers must be an array');
  }

  const cleaned = multipliers
    .map(m => Number(m))
    .filter(m => Number.isFinite(m) && m >= 1.0 && m <= 1000);

  if (cleaned.length < MIN_SAMPLE) {
    return err(`Need at least ${MIN_SAMPLE} rounds, got ${cleaned.length}`);
  }

  const sample = cleaned.slice(0, MAX_SAMPLE);

  // ── Fit lognormal ──
  // Convert to logs; compute mean and std dev of the logs.
  // (Note: ln(1.0) === 0, which is fine for the low end.)
  const logs = sample.map(m => Math.log(m));
  const mu = mean(logs);
  const sigmaRaw = stdDev(logs, mu);
  const sigma = Math.max(0.05, sigmaRaw); // floor to avoid divide-by-zero

  // ── Median + volatility + trend ──
  const sorted = [...sample].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const volatility = classifyVolatility(sigma);
  const trend = classifyTrend(sample);

  // ── Quantile-based crash predictions ──
  // Percentile → exit estimate. We use several percentiles of the lognormal
  // to produce a spread of signals (safer → bolder).
  const desiredCount = clamp(Math.round(count), 2, 8);
  const percentiles = pickPercentiles(desiredCount);

  const signals: EngineSignal[] = [];

  for (let i = 0; i < percentiles.length; i++) {
    const p = percentiles[i];
    const crashPrediction = lognormalQuantile(p, mu, sigma);
    const safeExit = crashPrediction * SAFETY_FACTOR;

    // Skip signals that are unrealistic
    if (safeExit < 1.05) continue;
        if (safeExit > MAX_EXIT_HARD) continue;

    // Confidence decreases with sigma and with ambition (higher p → lower conf)
    const baseConfidence = 100 - sigma * 40;
    const percentilePenalty = p * 60; // 0.3 percentile → -18
    const sampleBonus = sample.length >= 40 ? 5 : sample.length >= 25 ? 2 : 0;
    const trendBonus = trend === 'STABLE' ? 3 : trend === 'RISING' ? 1 : -2;

    const rawConfidence = baseConfidence - percentilePenalty + sampleBonus + trendBonus;
    const confidence = clamp(Math.round(rawConfidence), MIN_CONFIDENCE_HARD, 95);

    if (confidence < minConfidence) continue;

    const risk = classifyRisk(safeExit);
    const notes = buildNotes(risk, trend, volatility, sample.length);
    const price = priceFromConfidence(confidence, risk);

    signals.push({
      entry_point: 1.0,
      exit_point: round2(safeExit),
      confidence,
      risk_level: risk,
      signal_notes: notes,
      suggested_price: price,
    });
  }

  if (signals.length === 0) {
    return err(
      'No signals met your filters. Try lowering the minimum confidence or increasing the sample size.'
    );
  }

  return {
    success: true,
    signals,
    metadata: {
      sample_size: sample.length,
      median_crash: round2(median),
      mu: round4(mu),
      sigma: round4(sigma),
      volatility,
      trend,
      generated_at: new Date().toISOString(),
    },
  };
}

// ─────────────────────────────────────────────────────────
// Statistical helpers
// ─────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr: number[], m: number): number {
  if (arr.length < 2) return 0;
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * Inverse of the lognormal CDF, i.e. quantile function.
 * For lognormal: X = exp(mu + sigma * Z_p), where Z_p is the
 * standard normal quantile at probability p.
 * We approximate Z_p using an accurate rational approximation.
 */
function lognormalQuantile(p: number, mu: number, sigma: number): number {
  const z = inverseNormalCDF(p);
  return Math.exp(mu + sigma * z);
}

/**
 * Acklam's inverse normal CDF approximation.
 * Accurate to ~1e-9 for p in (0, 1).
 */
function inverseNormalCDF(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
             1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
             6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
             -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
             3.754408661907416e0];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > pHigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  q = p - 0.5;
  r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
         (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

// ─────────────────────────────────────────────────────────
// Classification helpers
// ─────────────────────────────────────────────────────────

function classifyVolatility(sigma: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (sigma < 0.6) return 'LOW';
  if (sigma < 1.1) return 'MEDIUM';
  return 'HIGH';
}

function classifyTrend(sample: number[]): 'RISING' | 'FALLING' | 'STABLE' {
  // Compare average of last 10 vs previous 10
  if (sample.length < 20) return 'STABLE';
  const recent = sample.slice(0, 10);
  const older = sample.slice(10, 20);
  const recentAvg = mean(recent);
  const olderAvg = mean(older);
  const diff = (recentAvg - olderAvg) / olderAvg;
  if (diff > 0.15) return 'RISING';
  if (diff < -0.15) return 'FALLING';
  return 'STABLE';
}

function classifyRisk(exitMultiplier: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (exitMultiplier < 1.8) return 'LOW';
  if (exitMultiplier < 3.5) return 'MEDIUM';
  return 'HIGH';
}

function pickPercentiles(count: number): number[] {
  // Distribute evenly between 0.35 and 0.85
  // 0.35 percentile is safe; 0.85 is ambitious
  const start = 0.35;
  const end = 0.85;
  if (count === 1) return [(start + end) / 2];
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    out.push(start + ((end - start) * i) / (count - 1));
  }
  return out;
}

function buildNotes(
  risk: 'LOW' | 'MEDIUM' | 'HIGH',
  trend: 'RISING' | 'FALLING' | 'STABLE',
  volatility: 'LOW' | 'MEDIUM' | 'HIGH',
  sampleSize: number
): string {
  const trendStr = trend === 'RISING'
    ? 'rising trend detected in recent rounds'
    : trend === 'FALLING'
      ? 'cooling trend — safer exits recommended'
      : 'stable trend';

  const volStr = volatility === 'LOW'
    ? 'low volatility across sample'
    : volatility === 'HIGH'
      ? 'high volatility — trade conservatively'
      : 'moderate volatility';

  const riskStr = risk === 'LOW'
    ? 'recommended for conservative play'
    : risk === 'MEDIUM'
      ? 'balanced risk/reward'
      : 'aggressive exit target';

  return `${trendStr}, ${volStr}. ${riskStr}. (based on ${sampleSize} rounds)`;
}

function priceFromConfidence(
  confidence: number,
  risk: 'LOW' | 'MEDIUM' | 'HIGH'
): number {
  const base = 2 + (confidence - 40) / 15; // 40% → $2, 90% → $5.33
  const riskMultiplier = risk === 'HIGH' ? 1.5 : risk === 'MEDIUM' ? 1.2 : 1.0;
  return round2(base * riskMultiplier);
}

// ─────────────────────────────────────────────────────────
// Number utilities
// ─────────────────────────────────────────────────────────
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function err(msg: string): EngineOutput {
  return {
    success: false,
    signals: [],
    metadata: {
      sample_size: 0,
      median_crash: 0,
      mu: 0,
      sigma: 0,
      volatility: 'LOW',
      trend: 'STABLE',
      generated_at: new Date().toISOString(),
    },
    error: msg,
  };
}