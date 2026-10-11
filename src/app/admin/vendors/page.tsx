// src/app/admin/vendors/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Loader2, RefreshCw, Building2, Eye, AlertCircle,
  Search, X, ChevronLeft, ChevronRight, ArrowUpDown,
  Users, ShieldCheck, Ban, TrendingUp, DollarSign, Clock,
} from 'lucide-react';
import { relativeTime } from '@/lib/providers/format';
import { getStatusTheme } from '@/lib/admin/status-theme';

type Vendor = {
  id: string;
  legal_name: string;
  display_name: string | null;
  entity_type: 'individual' | 'registered_business';
  email: string | null;
  phone: string | null;
  country: string;
  city: string | null;
  status:
    | 'application_started'
    | 'documents_submitted'
    | 'under_review'
    | 'info_required'
    | 'approved'
    | 'suspended'
    | 'rejected';
  settlement_method: 'full_remittance' | 'net_settlement';
  collection_currency: string;
  total_collected_usd: number;
  total_remitted_usd: number;
  outstanding_usd: number;
  total_earnings_usd: number;
  total_paid_usd: number;
  created_at: string;
};

type Counts = {
  application_started: number;
  documents_submitted: number;
  under_review: number;
  info_required: number;
  approved: number;
  suspended: number;
  rejected: number;
  total: number;
};

type Totals = { collected: number; remitted: number; outstanding: number };

type Tab =
  | 'application_started'
  | 'documents_submitted'
  | 'under_review'
  | 'info_required'
  | 'approved'
  | 'suspended'
  | 'rejected';

type SortKey = 'joined_desc' | 'joined_asc' | 'collected_desc' | 'collected_asc' | 'outstanding_desc' | 'outstanding_asc';

const PAGE_SIZE = 10;

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'joined_desc',      label: 'Newest first' },
  { value: 'joined_asc',       label: 'Oldest first' },
  { value: 'collected_desc',   label: 'Highest collected' },
  { value: 'collected_asc',    label: 'Lowest collected' },
  { value: 'outstanding_desc', label: 'Highest outstanding' },
  { value: 'outstanding_asc',  label: 'Lowest outstanding' },
];

export default function VendorsPage() {
  const [tab, setTab] = useState<Tab>('application_started');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [counts, setCounts] = useState<Counts>({
    application_started: 0, documents_submitted: 0, under_review: 0,
    info_required: 0, approved: 0, suspended: 0, rejected: 0, total: 0,
  });
  const [totals, setTotals] = useState<Totals>({ collected: 0, remitted: 0, outstanding: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('joined_desc');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/vendors?status=${tab}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load vendors');
      setVendors(data.vendors || []);
      setCounts(data.counts || counts);
      setTotals(data.totals || { collected: 0, remitted: 0, outstanding: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [tab]);

  const tabs: Array<{ id: Tab; label: string; count: number }> = useMemo(() => [
    { id: 'application_started', label: 'Started',   count: counts.application_started },
    { id: 'documents_submitted', label: 'Docs',      count: counts.documents_submitted },
    { id: 'under_review',        label: 'Review',    count: counts.under_review },
    { id: 'info_required',       label: 'Info req.', count: counts.info_required },
    { id: 'approved',            label: 'Approved',  count: counts.approved },
    { id: 'suspended',           label: 'Suspended', count: counts.suspended },
    { id: 'rejected',            label: 'Rejected',  count: counts.rejected },
  ], [counts]);

  const processed = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = vendors;

    if (q) {
      rows = rows.filter(v =>
        (v.legal_name ?? '').toLowerCase().includes(q) ||
        (v.display_name ?? '').toLowerCase().includes(q) ||
        (v.email ?? '').toLowerCase().includes(q) ||
        (v.phone ?? '').toLowerCase().includes(q) ||
        (v.city ?? '').toLowerCase().includes(q)
      );
    }

    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case 'joined_asc':        return a.created_at.localeCompare(b.created_at);
        case 'joined_desc':       return b.created_at.localeCompare(a.created_at);
        case 'collected_desc':    return (b.total_collected_usd ?? 0) - (a.total_collected_usd ?? 0);
        case 'collected_asc':     return (a.total_collected_usd ?? 0) - (b.total_collected_usd ?? 0);
        case 'outstanding_desc':  return (b.outstanding_usd ?? 0) - (a.outstanding_usd ?? 0);
        case 'outstanding_asc':   return (a.outstanding_usd ?? 0) - (b.outstanding_usd ?? 0);
        default:                  return 0;
      }
    });
  }, [vendors, search, sortKey]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => processed.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [processed, safePage]
  );

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
            <Building2 size={22} className="text-blue-400" /> Vendors
          </h1>
          <p className="text-sm text-white/40">
            Manage collection agents, KYC verification, and remittance obligations.
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

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={<Users size={14} />}        label="Total"        value={counts.total.toLocaleString()}          tint="text-blue-400" />
        <KpiCard icon={<Clock size={14} />}        label="In review"    value={(counts.under_review + counts.documents_submitted).toLocaleString()} tint="text-violet-400" />
        <KpiCard icon={<ShieldCheck size={14} />}  label="Approved"     value={counts.approved.toLocaleString()}        tint="text-emerald-400" />
        <KpiCard icon={<Ban size={14} />}          label="Suspended"    value={counts.suspended.toLocaleString()}       tint="text-slate-400" />
        <KpiCard
          icon={<TrendingUp size={14} />}
          label="Collected"
          value={`$${totals.collected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          tint="text-emerald-400"
        />
        <KpiCard
          icon={<DollarSign size={14} />}
          label="Outstanding"
          value={`$${totals.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          tint="text-amber-400"
        />
      </div>

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
              className={`px-3 py-2 text-sm font-bold transition border-b-2 -mb-[1px] flex items-center gap-2 whitespace-nowrap ${
                active
                  ? 'text-blue-400 border-blue-400'
                  : 'text-white/40 border-transparent hover:text-white/60'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  active ? 'bg-blue-500/20 text-blue-300' : 'bg-white/10 text-white/50'
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
            placeholder="Search legal name, email, phone, city…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/40 focus:border-blue-500/60 focus:outline-none text-sm text-white placeholder:text-white/30 transition-colors"
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
            className="appearance-none pl-8 pr-8 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/40 focus:border-blue-500/60 focus:outline-none text-sm text-white cursor-pointer transition-colors"
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
          {processed.length} {processed.length === 1 ? 'vendor' : 'vendors'}
        </div>
      </div>

      {/* Content */}
      {loading && vendors.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          <span className="ml-3 text-white/40">Loading vendors...</span>
        </div>
      ) : processed.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <Building2 size={32} className="text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/50 font-semibold">
            {search ? `No matches for "${search}"` : `No ${tab.replace(/_/g, ' ')} vendors`}
          </p>
          <p className="text-xs text-white/30 mt-1">
            {search
              ? 'Try a different search or reset the filters.'
              : 'Vendors will show up here as they apply.'}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/[0.04]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Vendor</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Type</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Location</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Collected</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Outstanding</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Applied</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Status</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white/40"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paged.map(v => {
                    const theme = getStatusTheme(v.status);
                    return (
                      <tr key={v.id} className="hover:bg-white/[0.03] transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-black">
                              {(v.display_name || v.legal_name || '?')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">{v.display_name || v.legal_name}</p>
                              <p className="text-[11px] text-white/40 truncate">{v.email || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                            v.entity_type === 'registered_business'
                              ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                              : 'bg-slate-500/10 text-slate-300 border-slate-500/20'
                          }`}>
                            {v.entity_type === 'registered_business' ? 'Business' : 'Individual'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-white/60">
                          {[v.city, v.country].filter(Boolean).join(', ') || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-white/70 font-mono">
                          ${Number(v.total_collected_usd ?? 0).toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-sm font-mono ${(v.outstanding_usd ?? 0) > 0 ? 'text-amber-300' : 'text-white/40'}`}>
                          ${Number(v.outstanding_usd ?? 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-xs text-white/40">{relativeTime(v.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${theme.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor}`} />
                            {theme.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/vendors/${v.id}`}
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

function KpiCard({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string; tint: string }) {
  return (
    <div className="relative rounded-2xl p-4 overflow-hidden bg-white/[0.03] border border-white/10 hover:border-blue-500/40 transition-all duration-300">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" aria-hidden />
      <div className="flex items-center gap-2 mb-1.5">
        <span className={tint}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</span>
      </div>
      <p className="text-2xl font-black text-white truncate">{value}</p>
    </div>
  );
}