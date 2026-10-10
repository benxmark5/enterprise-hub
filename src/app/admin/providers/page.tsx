// src/app/admin/providers/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw, Users, Eye, AlertCircle } from 'lucide-react';
import {
  statusColor,
  categoryIcon,
  relativeTime,
  type ProviderApplication,
} from '@/lib/providers/format';

type Counts = { pending: number; approved: number; rejected: number; total: number };
type Tab = 'pending' | 'approved' | 'rejected';

export default function ProvidersPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [apps, setApps] = useState<ProviderApplication[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/providers?status=${tab}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load providers');
      setApps(data.applications || []);
      setCounts(data.counts || { pending: 0, approved: 0, rejected: 0, total: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const tabs: Array<{ id: Tab; label: string; count: number }> = useMemo(() => [
    { id: 'pending',  label: 'Pending',  count: counts.pending },
    { id: 'approved', label: 'Approved', count: counts.approved },
    { id: 'rejected', label: 'Rejected', count: counts.rejected },
  ], [counts]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users size={22} className="text-emerald-400" /> Providers
          </h1>
          <p className="text-sm text-white/40">
            Review, approve, or reject provider applications.
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
      <div className="flex gap-2 border-b border-white/10">
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-bold transition border-b-2 -mb-[1px] flex items-center gap-2 ${
                active
                  ? 'text-amber-400 border-amber-400'
                  : 'text-white/40 border-transparent hover:text-white/60'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  active ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-white/50'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading && apps.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <span className="ml-3 text-white/40">Loading applications...</span>
        </div>
      ) : apps.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <Users size={32} className="text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/50 font-semibold">No {tab} applications</p>
          <p className="text-xs text-white/30 mt-1">Applications will show up here as customers submit them.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/[0.04]">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Applicant</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Service</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Country</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Submitted</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Status</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white/40"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {apps.map(app => {
                  const tone = statusColor(app.status);
                  return (
                    <tr key={app.id} className="hover:bg-white/[0.03] transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white text-xs font-black">
                            {(app.display_name || app.full_name || '?')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{app.display_name || app.full_name}</p>
                            <p className="text-[11px] text-white/40 truncate">{app.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span>{categoryIcon(app.service_category)}</span>
                          <span className="text-sm text-white/70 capitalize">{app.service_category}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60">{app.country || '—'}</td>
                      <td className="px-4 py-3 text-xs text-white/40">{relativeTime(app.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${tone.bg} ${tone.border} ${tone.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                          {tone.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/providers/${app.id}`}
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