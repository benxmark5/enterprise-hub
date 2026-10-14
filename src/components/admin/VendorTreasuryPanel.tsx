// src/components/admin/VendorTreasuryPanel.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Loader2, RefreshCw, TrendingUp, TrendingDown, AlertCircle,
  Landmark, ArrowDownRight, ArrowUpRight, Clock, Building2,
} from 'lucide-react';
import { relativeTime } from '@/lib/providers/format';

type Totals = {
  collected: number;
  verifiedCollected: number;
  pendingVerification: number;
  remitted: number;
  received: number;
  outstanding: number;
  overdue: number;
};

type VendorRow = {
  id: string;
  legal_name: string;
  display_name: string | null;
  country: string;
  status: string;
  settlement_method: string;
  collected: number;
  remitted: number;
  outstanding: number;
  earnings: number;
  paid: number;
};

type ActivityRow = {
  id: string;
  kind: 'collection' | 'remittance';
  vendor_name: string;
  amount_usd: number;
  status: string;
  payment_method?: string | null;
  external_ref?: string | null;
  bank_reference?: string | null;
  at: string;
};

type Payload = {
  totals: Totals;
  collectionsByStatus: Record<string, number>;
  remittancesByStatus: Record<string, number>;
  vendors: VendorRow[];
  activity: ActivityRow[];
  fetched_at: string;
};

const POLL_MS = 30_000;

export default function VendorTreasuryPanel() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await fetch('/api/admin/treasury/vendors', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Landmark size={16} className="text-blue-400" />
          <h2 className="text-lg font-bold text-white">Vendor treasury</h2>
          <span className="text-[10px] text-white/30 ml-1">
            Collection agents · remittance obligations
          </span>
        </div>
        <div className="flex items-center gap-3">
          {data?.fetched_at && (
            <span className="text-[10px] text-white/30">
              updated {relativeTime(data.fetched_at)}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300 flex-1">{error}</p>
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="animate-spin text-blue-400" />
        </div>
      ) : !data ? null : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi
              icon={<ArrowUpRight size={14} />}
              label="Collected"
              value={`$${fmt(data.totals.collected)}`}
              tint="text-emerald-400"
              hint={`${fmt(data.totals.verifiedCollected)} verified`}
            />
            <Kpi
              icon={<ArrowDownRight size={14} />}
              label="Received"
              value={`$${fmt(data.totals.received)}`}
              tint="text-blue-400"
              hint="remittances arrived"
            />
            <Kpi
              icon={<TrendingUp size={14} />}
              label="Outstanding"
              value={`$${fmt(data.totals.outstanding)}`}
              tint={data.totals.outstanding > 0 ? 'text-amber-400' : 'text-slate-400'}
              hint="collected − received"
            />
            <Kpi
              icon={<Clock size={14} />}
              label="Overdue"
              value={`$${fmt(data.totals.overdue)}`}
              tint={data.totals.overdue > 0 ? 'text-rose-400' : 'text-slate-400'}
              hint="past due date"
            />
          </div>

          {/* Per-vendor table */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <Building2 size={14} className="text-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                Vendors by collected volume
              </span>
              <span className="ml-auto text-[10px] text-white/30">
                {data.vendors.length} vendor{data.vendors.length === 1 ? '' : 's'}
              </span>
            </div>
            {data.vendors.length === 0 ? (
              <div className="p-8 text-center">
                <Landmark size={28} className="text-white/20 mx-auto mb-2" />
                <p className="text-sm text-white/50 font-semibold">No vendors yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/[0.03]">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Vendor</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-white/40">Collected</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-white/40">Remitted</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-white/40">Outstanding</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-white/40">Earnings</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Method</th>
                      <th className="px-4 py-2.5 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.vendors.map(v => (
                      <tr key={v.id} className="hover:bg-white/[0.03] transition">
                        <td className="px-4 py-3">
                          <p className="text-sm font-bold text-white truncate">
                            {v.display_name || v.legal_name}
                          </p>
                          <p className="text-[10px] text-white/40">{v.country}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-white/80 font-mono">
                          ${fmt(v.collected)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-white/60 font-mono">
                          ${fmt(v.remitted)}
                        </td>
                        <td className={`px-4 py-3 text-right text-sm font-mono ${
                          v.outstanding > 0 ? 'text-amber-300' : 'text-white/40'
                        }`}>
                          ${fmt(v.outstanding)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-purple-300 font-mono">
                          ${fmt(v.earnings)}
                        </td>
                        <td className="px-4 py-3 text-xs text-white/50 capitalize">
                          {v.settlement_method.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/vendors/${v.id}`}
                            className="text-xs text-blue-400 hover:text-blue-300 transition"
                          >
                            Open →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Activity feed */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <Clock size={14} className="text-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                Recent activity
              </span>
              <span className="ml-auto text-[10px] text-white/30">
                {data.activity.length} event{data.activity.length === 1 ? '' : 's'}
              </span>
            </div>
            {data.activity.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-white/40 italic">No activity yet</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {data.activity.map(a => (
                  <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      a.kind === 'collection'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {a.kind === 'collection' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white/80 truncate">
                        <span className="font-bold">{a.vendor_name}</span>
                        <span className="text-white/40"> · </span>
                        <span>{a.kind === 'collection' ? 'collection' : 'remittance'}</span>
                      </p>
                      <p className="text-[10px] text-white/40 mt-0.5 truncate">
                        {a.payment_method && `${a.payment_method} · `}
                        {a.external_ref && `${a.external_ref} · `}
                        {a.bank_reference && `${a.bank_reference} · `}
                        {relativeTime(a.at)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-mono font-bold ${
                        a.kind === 'collection' ? 'text-emerald-300' : 'text-blue-300'
                      }`}>
                        ${fmt(a.amount_usd)}
                      </p>
                      <p className="text-[9px] uppercase text-white/40 tracking-wider">
                        {a.status.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Kpi({
  icon, label, value, tint, hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: string;
  hint?: string;
}) {
  return (
    <div className="relative rounded-2xl p-4 overflow-hidden bg-white/[0.03] border border-white/10 hover:border-blue-500/40 transition-all duration-300">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" aria-hidden />
      <div className="flex items-center gap-2 mb-1.5">
        <span className={tint}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</span>
      </div>
      <p className="text-2xl font-black text-white truncate">{value}</p>
      {hint && <p className="text-[10px] text-white/30 mt-0.5">{hint}</p>}
    </div>
  );
}