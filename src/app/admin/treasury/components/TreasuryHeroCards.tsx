// src/app/admin/treasury/components/TreasuryHeroCards.tsx
'use client';

import { Wallet, Lock, Zap, Clock, CheckCircle2, XCircle, TrendingUp, Activity } from 'lucide-react';
import { formatMoney, formatUSD } from '@/lib/treasury/format';

export type TreasurySummary = {
  treasuries: Array<{
    id: string;
    currency: string;
    available_balance: number;
    reserved_for_withdrawals: number;
    updated_at: string;
  }>;
  pending: { count: number; total_usd: number };
  last30d: {
    completed_count: number;
    completed_total_usd: number;
    failed_count: number;
    failed_total_usd: number;
    reversed_count: number;
  };
};

type Props = { data: TreasurySummary | null; loading: boolean };

export default function TreasuryHeroCards({ data, loading }: Props) {
  const kes = data?.treasuries.find(t => t.currency === 'KES');
  const usd = data?.treasuries.find(t => t.currency === 'USD');

  const cards = [
    {
      label: 'KES Treasury',
      value: formatMoney(kes?.available_balance ?? 0, 'KES'),
      icon: <Wallet size={16} className="text-amber-400" />,
      accent: 'text-amber-300',
    },
    {
      label: 'USD Treasury',
      value: formatUSD(usd?.available_balance ?? 0),
      icon: <Wallet size={16} className="text-emerald-400" />,
      accent: 'text-emerald-300',
    },
    {
      label: 'Reserved (KES)',
      value: formatMoney(kes?.reserved_for_withdrawals ?? 0, 'KES'),
      icon: <Lock size={16} className="text-orange-400" />,
      accent: 'text-orange-300',
    },
    {
      label: 'Pending Payouts',
      value: `${data?.pending.count ?? 0}`,
      sub: formatUSD(data?.pending.total_usd ?? 0),
      icon: <Clock size={16} className="text-amber-400" />,
      accent: 'text-amber-300',
    },
    {
      label: 'Paid (30d)',
      value: `${data?.last30d.completed_count ?? 0}`,
      sub: formatUSD(data?.last30d.completed_total_usd ?? 0),
      icon: <CheckCircle2 size={16} className="text-emerald-400" />,
      accent: 'text-emerald-300',
    },
    {
      label: 'Failed (30d)',
      value: `${data?.last30d.failed_count ?? 0}`,
      sub: formatUSD(data?.last30d.failed_total_usd ?? 0),
      icon: <XCircle size={16} className="text-red-400" />,
      accent: 'text-red-300',
    },
    {
      label: 'Reversed (30d)',
      value: `${data?.last30d.reversed_count ?? 0}`,
      icon: <Activity size={16} className="text-purple-400" />,
      accent: 'text-purple-300',
    },
    {
      label: 'Net Flow (30d)',
      value: formatUSD(
        (data?.last30d.completed_total_usd ?? 0) * -1
      ),
      icon: <TrendingUp size={16} className="text-cyan-400" />,
      accent: 'text-cyan-300',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(c => (
        <div
          key={c.label}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 backdrop-blur-sm transition hover:border-amber-500/30 hover:bg-white/[0.08]"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              {c.label}
            </p>
            {c.icon}
          </div>
          {loading ? (
            <div className="h-7 w-24 rounded-md bg-white/5 animate-pulse" />
          ) : (
            <p className={`text-xl md:text-2xl font-black tabular-nums ${c.accent}`}>
              {c.value}
            </p>
          )}
          {c.sub && !loading && (
            <p className="text-[11px] text-white/40 mt-1 tabular-nums">{c.sub}</p>
          )}
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-500/5 blur-2xl" />
        </div>
      ))}
    </div>
  );
}