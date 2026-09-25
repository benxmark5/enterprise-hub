// src/lib/treasury/format.ts

export type TreasuryStatus =
  | 'TREASURY_FUNDING'
  | 'CUSTOMER_WITHDRAWAL_RESERVE'
  | 'CUSTOMER_WITHDRAWAL_PAID'
  | 'CUSTOMER_WITHDRAWAL_FAILED'
  | 'CUSTOMER_WITHDRAWAL_REVERSED'
  | 'TREASURY_ADJUSTMENT';

export const TX_LABELS: Record<string, { label: string; tone: 'in' | 'out' | 'warn' | 'neutral' }> = {
  TREASURY_FUNDING:               { label: 'Funding',           tone: 'in' },
  CUSTOMER_WITHDRAWAL_RESERVE:    { label: 'Withdrawal hold',   tone: 'warn' },
  CUSTOMER_WITHDRAWAL_PAID:       { label: 'Withdrawal paid',   tone: 'out' },
  CUSTOMER_WITHDRAWAL_FAILED:     { label: 'Withdrawal failed', tone: 'in' },
  CUSTOMER_WITHDRAWAL_REVERSED:   { label: 'Withdrawal reversed', tone: 'in' },
  TREASURY_ADJUSTMENT:            { label: 'Adjustment',        tone: 'neutral' },
};

export function formatMoney(amount: number | string | null | undefined, currency = 'KES'): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return `${currency} 0.00`;
  return `${currency} ${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatUSD(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return '$0.00';
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function toneClasses(tone: 'in' | 'out' | 'warn' | 'neutral'): {
  bg: string; border: string; text: string; dot: string;
} {
  switch (tone) {
    case 'in':
      return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-300',
        dot: 'bg-emerald-400',
      };
    case 'out':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-300',
        dot: 'bg-red-400',
      };
    case 'warn':
      return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-300',
        dot: 'bg-amber-400',
      };
    default:
      return {
        bg: 'bg-zinc-500/10',
        border: 'border-zinc-500/30',
        text: 'text-zinc-300',
        dot: 'bg-zinc-400',
      };
  }
}

export function goldGradient(percent: number): string {
  // Returns a linear-gradient string for bars — green to gold
  const p = Math.max(0, Math.min(100, percent));
  return `linear-gradient(90deg, #10b981 0%, #fbbf24 ${p}%, rgba(255,255,255,0.05) ${p}%)`;
}