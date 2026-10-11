// src/app/admin/marketers/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Loader2, RefreshCw, Target, Eye, AlertCircle, Copy,
  Search, X, ChevronLeft, ChevronRight, ArrowUpDown,
  Users, UserCheck, Clock, Ban, TrendingUp, DollarSign,
  Trophy, Crown, Medal,
} from 'lucide-react';
import { relativeTime } from '@/lib/providers/format';
import { getStatusTheme } from '@/lib/admin/status-theme';
import MarketerAnalytics from '@/components/admin/MarketerAnalytics';

type Marketer = {
  id: string;
  referral_code: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  total_conversions: number;
  pending_earnings: number;
  total_paid: number;
  created_at: string;
};

type Counts = { pending: number; approved: number; rejected: number; suspended: number; total: number };
type Totals = { conversions: number; pendingEarnings: number; paid: number };
type Tab = 'pending' | 'approved' | 'rejected' | 'suspended';
type SortKey = 'joined_desc' | 'joined_asc' | 'conversions_desc' | 'conversions_asc' | 'earnings_desc' | 'earnings_asc';

const PAGE_SIZE = 10;

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'joined_desc',      label: 'Newest first' },
  { value: 'joined_asc',       label: 'Oldest first' },
  { value: 'conversions_desc', label: 'Most conversions' },
  { value: 'conversions_asc',  label: 'Fewest conversions' },
  { value: 'earnings_desc',    label: 'Highest earnings' },
  { value: 'earnings_asc',     label: 'Lowest earnings' },
];

export default function MarketersPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [marketers, setMarketers] = useState<Marketer[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, rejected: 0, suspended: 0, total: 0 });
  const [totals, setTotals] = useState<Totals>({ conversions: 0, pendingEarnings: 0, paid: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('joined_desc');
  const [page, setPage] = useState(1);

  const [allMarketers, setAllMarketers] = useState<Marketer[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/marketers?status=${tab}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load marketers');
      setMarketers(data.marketers || []);
      setCounts(data.counts || { pending: 0, approved: 0, rejected: 0, suspended: 0, total: 0 });
      setTotals(data.totals || { conversions: 0, pendingEarnings: 0, paid: 0 });

      const allRes = await fetch('/api/admin/marketers?status=all', { cache: 'no-store' });
      const allData = await allRes.json();
      if (allRes.ok) setAllMarketers(allData.marketers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [tab]);

  const tabs: Array<{ id: Tab; label: string; count: number }> = useMemo(() => [
    { id: 'pending',   label: 'Pending',   count: counts.pending },
    { id: 'approved',  label: 'Approved',  count: counts.approved },
    { id: 'rejected',  label: 'Rejected',  count: counts.rejected },
    { id: 'suspended', label: 'Suspended', count: counts.suspended },
  ], [counts]);

  const processed = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = marketers;

    if (q) {
      rows = rows.filter(m =>
        (m.display_name ?? '').toLowerCase().includes(q) ||
        (m.email ?? '').toLowerCase().includes(q) ||
        (m.referral_code ?? '').toLowerCase().includes(q)
      );
    }

    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case 'joined_asc':       return a.created_at.localeCompare(b.created_at);
        case 'joined_desc':      return b.created_at.localeCompare(a.created_at);
        case 'conversions_asc':  return (a.total_conversions ?? 0) - (b.total_conversions ?? 0);
        case 'conversions_desc': return (b.total_conversions ?? 0) - (a.total_conversions ?? 0);
        case 'earnings_asc':     return (a.pending_earnings ?? 0) - (b.pending_earnings ?? 0);
        case 'earnings_desc':    return (b.pending_earnings ?? 0) - (a.pending_earnings ?? 0);
        default:                 return 0;
      }
    });
  }, [marketers, search, sortKey]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => processed.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [processed, safePage]
  );

  const topMarketers = useMemo(() => {
    return [...allMarketers]
      .filter(m => m.status === 'approved')
      .sort((a, b) => (b.total_conversions ?? 0) - (a.total_conversions ?? 0))
      .slice(0, 3);
  }, [allMarketers]);

  const copyCode = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* ignore */ }
  };

  const resetFilters = () => {
    setSearch('');
    setSortKey('joined_desc');
    setPage(1);
  };

  const hasFilters = search.trim().length > 0 || sortKey !== 'joined_desc';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target size={22} className="text-purple-400" /> Marketers
          </h1>
          <p className="text-sm text-white/40">
            Manage referral partners, approve applications, and review performance.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI strip (clickable) + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
          <KpiCard
            icon={<Users size={14} />}
            label="Total"
            value={counts.total.toLocaleString()}
            tint="text-purple-400"
            onClick={() => setTab('approved')}
            active={false}
          />
          <KpiCard
            icon={<Clock size={14} />}
            label="Pending"
            value={counts.pending.toLocaleString()}
            tint="text-amber-400"
            onClick={() => setTab('pending')}
            active={tab === 'pending'}
          />
          <KpiCard
            icon={<UserCheck size={14} />}
            label="Approved"
            value={counts.approved.toLocaleString()}
            tint="text-emerald-400"
            onClick={() => setTab('approved')}
            active={tab === 'approved'}
          />
          <KpiCard
            icon={<Ban size={14} />}
            label="Suspended"
            value={counts.suspended.toLocaleString()}
            tint="text-slate-400"
            onClick={() => setTab('suspended')}
            active={tab === 'suspended'}
          />
          <KpiCard
            icon={<TrendingUp size={14} />}
            label="Conversions"
            value={totals.conversions.toLocaleString()}
            tint="text-blue-400"
          />
          <KpiCard
            icon={<DollarSign size={14} />}
            label="Pending $"
            value={`$${totals.pendingEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            tint="text-emerald-400"
          />
        </div>

        {/* Leaderboard */}
        <div className="relative rounded-2xl p-4 overflow-hidden bg-white/[0.03] border border-white/10 hover:border-purple-500/40 transition-all duration-300">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" aria-hidden />
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={14} className="text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Top marketers
            </span>
          </div>

          {topMarketers.length === 0 ? (
            <p className="text-xs text-white/30 italic py-4">
              No approved marketers yet.
            </p>
          ) : (
            <div className="space-y-2">
              {topMarketers.map((m, i) => {
                const rankIcon =
                  i === 0 ? <Crown size={14} className="text-amber-400" /> :
                  i === 1 ? <Medal size={14} className="text-slate-300" /> :
                  <Medal size={14} className="text-amber-700" />;
                return (
                  <Link
                    key={m.id}
                    href={`/admin/marketers/${m.id}`}
                    className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition group"
                  >
                    <span className="flex-shrink-0">{rankIcon}</span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                      {(m.display_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition">
                        {m.display_name}
                      </p>
                      <p className="text-[10px] text-white/40 truncate">{m.referral_code}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-white">
                        {(m.total_conversions ?? 0).toLocaleString()}
                      </p>
                      <p className="text-[9px] uppercase text-white/30 tracking-wider">conv</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Analytics dashboard */}
      <MarketerAnalytics />

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300 flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-red-400">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-bold transition border-b-2 -mb-[1px] flex items-center gap-2 whitespace-nowrap ${
                active
                  ? 'text-purple-400 border-purple-400'
                  : 'text-white/40 border-transparent hover:text-white/60'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  active ? 'bg-purple-500/20 text-purple-300' : 'bg-white/10 text-white/50'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, email, or referral code…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/40 focus:border-purple-500/60 focus:outline-none text-sm text-white placeholder:text-white/30 transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="relative">
          <ArrowUpDown size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <select
            value={sortKey}
            onChange={(e) => { setSortKey(e.target.value as SortKey); setPage(1); }}
            className="appearance-none pl-8 pr-8 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/40 focus:border-purple-500/60 focus:outline-none text-sm text-white cursor-pointer transition-colors"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value} className="bg-slate-900 text-white">
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs text-white/40 hover:text-white/80 transition underline decoration-dotted"
          >
            Reset
          </button>
        )}

        <div className="ml-auto text-xs text-white/40">
          {processed.length} {processed.length === 1 ? 'marketer' : 'marketers'}
        </div>
      </div>

      {/* Content */}
      {loading && marketers.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <span className="ml-3 text-white/40">Loading marketers...</span>
        </div>
      ) : processed.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <Target size={32} className="text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/50 font-semibold">
            {search ? `No matches for "${search}"` : `No ${tab} marketers`}
          </p>
          <p className="text-xs text-white/30 mt-1">
            {search
              ? 'Try a different search or reset the filters.'
              : 'Marketers will show up here as they apply.'}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/[0.04]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Marketer</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Referral Code</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Country</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Conversions</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Submitted</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Status</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white/40"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paged.map(m => {
                    const theme = getStatusTheme(m.status);
                    return (
                      <tr key={m.id} className="hover:bg-white/[0.03] transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-black">
                              {(m.display_name || '?')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">{m.display_name}</p>
                              <p className="text-[11px] text-white/40 truncate">{m.email || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => copyCode(m.id, m.referral_code)}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/80 transition"
                            title="Copy code"
                          >
                            {m.referral_code}
                            <Copy size={10} className="text-white/40" />
                            {copiedId === m.id && (
                              <span className="text-[9px] text-emerald-400 ml-1">copied</span>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-white/60">{m.country || '—'}</td>
                        <td className="px-4 py-3 text-sm text-white/70">{m.total_conversions ?? 0}</td>
                        <td className="px-4 py-3 text-xs text-white/40">{relativeTime(m.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${theme.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor}`} />
                            {theme.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/marketers/${m.id}`}
                            className="inline-flex p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition"
                          >
                            <Eye size={14} className="text-white/60 hover:text-white" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-xs text-white/40">
                Page {safePage} of {totalPages} · {processed.length} total
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={12} /> Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  Next <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon, label, value, tint, onClick, active,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const clickable = !!onClick;
  const base =
    'relative rounded-2xl p-4 overflow-hidden bg-white/[0.03] border transition-all duration-300 text-left w-full';
  const state = active
    ? 'border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
    : clickable
      ? 'border-white/10 hover:border-purple-500/40 hover:bg-white/[0.05] cursor-pointer'
      : 'border-white/10';

  const inner = (
    <>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" aria-hidden />
      <div className="flex items-center gap-2 mb-1.5">
        <span className={tint}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</span>
      </div>
      <p className="text-2xl font-black text-white truncate">{value}</p>
    </>
  );

  if (clickable) {
    return (
      <button type="button" onClick={onClick} className={`${base} ${state}`}>
        {inner}
      </button>
    );
  }

  return <div className={`${base} ${state}`}>{inner}</div>;
}