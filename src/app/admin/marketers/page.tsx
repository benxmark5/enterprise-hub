// src/app/admin/marketers/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw, Users, Eye, AlertCircle, Target, Copy } from 'lucide-react';
import { relativeTime } from '@/lib/providers/format';
import { getStatusTheme } from '@/lib/admin/status-theme';

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
type Tab = 'pending' | 'approved' | 'rejected' | 'suspended';

export default function MarketersPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [marketers, setMarketers] = useState<Marketer[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, rejected: 0, suspended: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/marketers?status=${tab}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load marketers');
      setMarketers(data.marketers || []);
      setCounts(data.counts || { pending: 0, approved: 0, rejected: 0, suspended: 0, total: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const tabs: Array<{ id: Tab; label: string; count: number }> = useMemo(() => [
    { id: 'pending',   label: 'Pending',   count: counts.pending },
    { id: 'approved',  label: 'Approved',  count: counts.approved },
    { id: 'rejected',  label: 'Rejected',  count: counts.rejected },
    { id: 'suspended', label: 'Suspended', count: counts.suspended },
  ], [counts]);

  const copyCode = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* ignore */ }
  };

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

      {/* Content */}
      {loading && marketers.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <span className="ml-3 text-white/40">Loading marketers...</span>
        </div>
      ) : marketers.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <Target size={32} className="text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/50 font-semibold">No {tab} marketers</p>
          <p className="text-xs text-white/30 mt-1">Marketers will show up here as they apply.</p>
        </div>
      ) : (
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
                {marketers.map(m => {
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
      )}
    </div>
  );
}