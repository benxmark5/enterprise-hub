// src/app/admin/treasury/ledger/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, RefreshCw, Download } from 'lucide-react';
import TreasuryLedgerTable, { type LedgerRow } from '../components/TreasuryLedgerTable';

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'TREASURY_FUNDING', label: 'Funding' },
  { value: 'CUSTOMER_WITHDRAWAL_RESERVE', label: 'Withdrawal hold' },
  { value: 'CUSTOMER_WITHDRAWAL_PAID', label: 'Withdrawal paid' },
  { value: 'CUSTOMER_WITHDRAWAL_FAILED', label: 'Withdrawal failed' },
  { value: 'CUSTOMER_WITHDRAWAL_REVERSED', label: 'Withdrawal reversed' },
  { value: 'TREASURY_ADJUSTMENT', label: 'Adjustment' },
];

const CURRENCY_OPTIONS = [
  { value: '', label: 'All currencies' },
  { value: 'KES', label: 'KES' },
  { value: 'USD', label: 'USD' },
];

export default function TreasuryLedgerPage() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (typeFilter) params.set('type', typeFilter);
      if (currencyFilter) params.set('currency', currencyFilter);

      const res = await fetch('/api/admin/treasury-ledger?' + params.toString(), { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) setRows(data.rows || []);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, currencyFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter(r =>
      (r.reference || '').toLowerCase().includes(s) ||
      (r.description || '').toLowerCase().includes(s) ||
      (r.created_by || '').toLowerCase().includes(s)
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    for (const r of filtered) {
      if (r.direction === 'in') totalIn += r.amount;
      else totalOut += r.amount;
    }
    return { count: filtered.length, totalIn, totalOut, net: totalIn - totalOut };
  }, [filtered]);

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Description', 'Reference', 'Direction', 'Amount', 'Currency', 'By'];
    const csv = [
      headers.join(','),
      ...filtered.map(r =>
        [
          new Date(r.created_at).toISOString(),
          r.type,
          '"' + (r.description || '').replace(/"/g, '""') + '"',
          r.reference || '',
          r.direction,
          r.amount.toFixed(2),
          r.currency,
          r.created_by || 'system',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'treasury-ledger-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/treasury" className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition">
            <ArrowLeft size={16} className="text-white/60" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white">Treasury Ledger</h1>
            <p className="text-sm text-white/40">Full transaction history · auditable record</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={exportCSV} disabled={loading || filtered.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-white/70 transition disabled:opacity-50">
            <Download size={12} />
            Export CSV
          </button>
          <button type="button" onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-white/70 transition disabled:opacity-50">
            <RefreshCw size={12} className={loading ? 'animate-spin text-amber-400' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Entries</p>
          <p className="text-2xl font-black text-white tabular-nums mt-1">{stats.count}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/60">Total In</p>
          <p className="text-2xl font-black text-emerald-300 tabular-nums mt-1">
            {stats.totalIn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-300/60">Total Out</p>
          <p className="text-2xl font-black text-red-300 tabular-nums mt-1">
            {stats.totalOut.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/60">Net</p>
          <p className={'text-2xl font-black tabular-nums mt-1 ' + (stats.net >= 0 ? 'text-amber-300' : 'text-red-300')}>
            {stats.net >= 0 ? '+' : ''}{stats.net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by reference, description, or admin..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 outline-none focus:border-amber-500/40" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-amber-500/40">
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={currencyFilter} onChange={e => setCurrencyFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none focus:border-amber-500/40">
          {CURRENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <TreasuryLedgerTable rows={filtered} loading={loading} />
    </div>
  );
}
