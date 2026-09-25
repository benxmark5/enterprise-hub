// src/app/admin/treasury/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Coins, RefreshCw, Plus, ArrowRight, Activity, TrendingUp } from 'lucide-react';
import TreasuryHeroCards, { type TreasurySummary } from './components/TreasuryHeroCards';
import PaystackBalanceCard from './components/PaystackBalanceCard';
import TreasuryLedgerTable, { type LedgerRow } from './components/TreasuryLedgerTable';
import FundTreasuryModal from './components/FundTreasuryModal';
import { DonutChart, Sparkline, BarChart } from './components/TreasuryMiniCharts';

const POLL_MS = 30_000;

export default function TreasuryDashboard() {
  const [summary, setSummary] = useState<TreasurySummary | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [fundOpen, setFundOpen] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/treasury-summary', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) {
        setSummary(data);
        setLastSync(data.fetched_at);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLedger = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/treasury-ledger?limit=30', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) setLedger(data.rows || []);
    } finally {
      setLedgerLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
    loadLedger();
    const id = setInterval(() => {
      loadSummary();
      loadLedger();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [loadSummary, loadLedger]);

  // Donut: composition of treasury (available vs reserved), summed across currencies
  const donutSegments = useMemo(() => {
    if (!summary) return [];
    let available = 0;
    let reserved = 0;
    for (const t of summary.treasuries) {
      available += t.available_balance;
      reserved += t.reserved_for_withdrawals;
    }
    return [
      { label: 'Available', value: available || 0.0001, color: '#fbbf24' },
      { label: 'Reserved', value: reserved || 0.0001, color: '#10b981' },
    ];
  }, [summary]);

  // Bar chart: withdrawals over the last 14 days from ledger
  const barData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().slice(0, 10);
    });
    const totals: Record<string, number> = {};
    for (const d of days) totals[d] = 0;
    for (const row of ledger) {
      const day = row.created_at.slice(0, 10);
      if (day in totals) totals[day] += row.amount;
    }
    return days.map(d => ({
      label: d.slice(8), // day of month
      value: totals[d],
    }));
  }, [ledger]);

  // Sparkline: last N ledger amounts cumulative
  const sparkValues = useMemo(() => {
    const sorted = [...ledger].reverse();
    let sum = 0;
    return sorted.map(r => {
      sum += r.direction === 'in' ? r.amount : -r.amount;
      return sum;
    });
  }, [ledger]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Coins size={22} className="text-amber-400" />
            Treasury
          </h1>
          <p className="text-sm text-white/40">
            Company operational funds · {lastSync ? `synced ${new Date(lastSync).toLocaleTimeString()}` : 'loading...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/treasury/ledger"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-white/70 transition"
          >
            Full Ledger <ArrowRight size={12} />
          </Link>
          <button
            type="button"
            onClick={() => { loadSummary(); loadLedger(); }}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-white/70 transition disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin text-amber-400' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setFundOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-black text-xs font-black transition hover:brightness-110"
          >
            <Plus size={12} /> Fund Treasury
          </button>
        </div>
      </div>

      {/* Hero cards */}
      <TreasuryHeroCards data={summary} loading={loading} />

      {/* Middle row: Paystack + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <PaystackBalanceCard />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Treasury Split</p>
            <Activity size={14} className="text-emerald-400" />
          </div>
          <div className="flex items-center gap-4">
            <DonutChart segments={donutSegments} size={130} thickness={16} />
            <div className="space-y-2 flex-1">
              {donutSegments.map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-xs text-white/50 flex-1">{s.label}</span>
                  <span className="text-sm font-black tabular-nums text-white">
                    {s.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Net Flow (last 20)</p>
            <TrendingUp size={14} className="text-amber-400" />
          </div>
          <Sparkline values={sparkValues} width={300} height={80} color="#fbbf24" />
        </div>
      </div>

      {/* Movement chart */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">
          Treasury Movement · Last 14 Days
        </p>
        <BarChart data={barData} height={140} />
      </div>

      {/* Ledger preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">
            Recent Ledger Entries
          </p>
          <Link
            href="/admin/treasury/ledger"
            className="text-xs font-bold text-amber-400 hover:text-amber-300"
          >
            View all →
          </Link>
        </div>
        <TreasuryLedgerTable rows={ledger.slice(0, 10)} loading={ledgerLoading} />
      </div>

      <FundTreasuryModal
        open={fundOpen}
        onClose={() => setFundOpen(false)}
        onSuccess={() => { loadSummary(); loadLedger(); }}
      />
    </div>
  );
}