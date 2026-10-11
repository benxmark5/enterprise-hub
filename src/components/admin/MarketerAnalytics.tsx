// src/components/admin/MarketerAnalytics.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, Legend,
} from 'recharts';
import { Loader2, PieChart as PieIcon, Activity, Trophy } from 'lucide-react';

type Range = '7d' | '30d' | '90d' | '12m' | 'lifetime';

type Analytics = {
  range: Range;
  statusDistribution: Array<{ name: string; value: number }>;
  topMarketers: Array<{ name: string; code: string; conversions: number }>;
  timeline: Array<{ date: string; label: string; clicks: number; signups: number }>;
  totals: { clicks: number; signups: number };
};

const STATUS_COLORS: Record<string, string> = {
  Pending:   '#f59e0b',
  Approved:  '#10b981',
  Rejected:  '#f43f5e',
  Suspended: '#94a3b8',
};

const RANGES: Array<{ id: Range; label: string }> = [
  { id: '7d',       label: '7 days' },
  { id: '30d',      label: '30 days' },
  { id: '90d',      label: '90 days' },
  { id: '12m',      label: '12 months' },
  { id: 'lifetime', label: 'Lifetime' },
];

export default function MarketerAnalytics() {
  const [range, setRange] = useState<Range>('30d');
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/admin/marketers/analytics?range=${range}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load analytics');
      setData(json as Analytics);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const hasTimeline = (data?.timeline.length ?? 0) > 0;
  const hasTop = (data?.topMarketers.length ?? 0) > 0;
  const hasStatus = (data?.statusDistribution.some(s => s.value > 0)) ?? false;

  return (
    <div className="space-y-4">
      {/* Header + range chips */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <PieIcon size={14} className="text-purple-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            Analytics
          </span>
          {data && (
            <span className="text-[10px] text-white/30 ml-1">
              {data.totals.clicks} clicks · {data.totals.signups} signups
            </span>
          )}
        </div>
        <div className="flex gap-1 flex-wrap">
          {RANGES.map(r => {
            const active = r.id === range;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                  active
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/70 hover:border-purple-500/30'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          <span className="ml-3 text-sm text-white/40">Loading analytics...</span>
        </div>
      ) : !data ? null : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 1. Status distribution (donut) */}
          <ChartCard title="Status distribution" icon={<PieIcon size={12} />}>
            {!hasStatus ? (
              <EmptyChart label="No marketers yet" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.statusDistribution}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="rgba(0,0,0,0.4)"
                  >
                    {data.statusDistribution.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] ?? '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* 2. Top marketers (bar) */}
          <ChartCard title="Top 5 marketers" icon={<Trophy size={12} />}>
            {!hasTop ? (
              <EmptyChart label="No approved marketers" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.topMarketers} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#64748b"
                    tick={{ fontSize: 10 }}
                    width={90}
                  />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar
                    dataKey="conversions"
                    fill="#a855f7"
                    radius={[0, 6, 6, 0]}
                    name="Conversions"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* 3. Signups timeline (line) */}
          <ChartCard title="Signups & clicks over time" icon={<Activity size={12} />}>
            {!hasTimeline ? (
              <EmptyChart label="No referral activity yet" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.timeline} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                  <XAxis
                    dataKey="label"
                    stroke="#64748b"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fontSize: 10 }}
                    width={30}
                  />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend
                    verticalAlign="top"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 10, color: '#94a3b8' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    name="Clicks"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#a855f7' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="signups"
                    name="Signups"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#10b981' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative rounded-2xl p-4 overflow-hidden bg-white/[0.03] border border-white/10 hover:border-purple-500/30 transition-all duration-300">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" aria-hidden />
      <div className="flex items-center gap-2 mb-3">
        <span className="text-purple-400">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{title}</span>
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-[220px] text-xs text-white/30 italic">
      {label}
    </div>
  );
}

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-slate-900/95 border border-slate-700/60 backdrop-blur-md px-3 py-2 shadow-xl">
      {label && <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs text-slate-200">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.payload?.fill }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}