"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/app/supabase';
import Link from 'next/link';
import {
  ArrowLeft, TrendingUp, DollarSign,
  ShoppingBag, Users, BarChart3,
  Download, Search, Filter,
  CheckCircle, Clock, XCircle, Zap
} from 'lucide-react';

type Purchase = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  reference: string;
  plan: string;
  signal_type: string;
  signals_count: number;
  status: string;
  created_at: string;
  completed_at: string;
  expires_at: string;
};

type DayRevenue = { date: string; amount: number; count: number };

export default function InventoryPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filtered, setFiltered] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [weekData, setWeekData] = useState<DayRevenue[]>([]);
  const [tab, setTab] = useState<'overview' | 'transactions' | 'analytics'>('overview');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('purchases')
      .select('*')
      .order('created_at', { ascending: false });

    const all = data || [];
    setPurchases(all);
    setFiltered(all);

    // Build weekly chart data
    const days: DayRevenue[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayPurchases = all.filter(
        p => p.created_at?.startsWith(dateStr) &&
          p.status === 'completed'
      );
      days.push({
        date: d.toLocaleDateString('en', {
          weekday: 'short'
        }),
        amount: dayPurchases.reduce(
          (s, p) => s + (p.amount || 0), 0
        ),
        count: dayPurchases.length,
      });
    }
    setWeekData(days);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let result = [...purchases];
    if (filter !== 'all') {
      result = result.filter(p => p.status === filter);
    }
    if (typeFilter !== 'all') {
      result = result.filter(
        p => p.signal_type === typeFilter
      );
    }
    if (search) {
      result = result.filter(p =>
        p.reference?.toLowerCase().includes(
          search.toLowerCase()
        ) ||
        p.plan?.toLowerCase().includes(
          search.toLowerCase()
        )
      );
    }
    setFiltered(result);
  }, [search, filter, typeFilter, purchases]);

  const completed = purchases.filter(
    p => p.status === 'completed'
  );
  const totalRev = completed.reduce(
    (s, p) => s + (p.amount || 0), 0
  );
  const todayRev = completed.filter(
    p => p.created_at?.startsWith(
      new Date().toISOString().split('T')[0]
    )
  ).reduce((s, p) => s + (p.amount || 0), 0);
  const footballRev = completed.filter(
    p => p.signal_type === 'football'
  ).reduce((s, p) => s + (p.amount || 0), 0);
  const aviatorRev = completed.filter(
    p => p.signal_type === 'aviator'
  ).reduce((s, p) => s + (p.amount || 0), 0);

  const maxAmount = Math.max(
    ...weekData.map(d => d.amount), 1
  );

  const exportCSV = () => {
    const headers = [
      'Reference', 'Type', 'Plan', 'Amount',
      'Currency', 'Status', 'Date'
    ];
    const rows = filtered.map(p => [
      p.reference || '',
      p.signal_type || '',
      p.plan || '',
      p.amount || 0,
      p.currency || 'KES',
      p.status || '',
      new Date(p.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows]
      .map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `globalhub-sales-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white 
      font-sans p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/"
              className="flex items-center text-zinc-500 
                hover:text-white mb-2 text-xs font-bold 
                uppercase tracking-widest">
              <ArrowLeft size={14} className="mr-2" />
              Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <BarChart3 className="text-green-400" size={28} />
              <h1 className="text-3xl font-black italic 
                tracking-tight text-green-400 uppercase">
                INVENTORY_CMD
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-2 
              bg-zinc-900 border border-zinc-700 
              hover:border-green-500/50 text-zinc-300 
              px-5 py-2.5 rounded-xl text-xs font-bold 
              uppercase transition-all"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900/50 
          border border-zinc-800 rounded-xl p-1 mb-6 
          w-fit">
          {(['overview', 'transactions', 'analytics'] as const)
            .map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-xs 
                font-bold uppercase tracking-wider 
                transition-all ${
                tab === t
                  ? 'bg-green-500 text-black'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <>
            {/* Revenue Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 
              gap-4 mb-6">
              {[
                {
                  label: 'Total Revenue',
                  value: `KES ${totalRev.toLocaleString()}`,
                  sub: `${completed.length} sales`,
                  icon: DollarSign, color: '#22c55e'
                },
                {
                  label: "Today's Revenue",
                  value: `KES ${todayRev.toLocaleString()}`,
                  sub: 'Today',
                  icon: TrendingUp, color: '#60a5fa'
                },
                {
                  label: '⚽ Football',
                  value: `KES ${footballRev.toLocaleString()}`,
                  sub: `${completed.filter(p => p.signal_type === 'football').length} sales`,
                  icon: ShoppingBag, color: '#fbbf24'
                },
                {
                  label: '✈️ Aviator',
                  value: `KES ${aviatorRev.toLocaleString()}`,
                  sub: `${completed.filter(p => p.signal_type === 'aviator').length} sales`,
                  icon: Zap, color: '#f87171'
                },
              ].map(c => {
                const Icon = c.icon;
                return (
                  <div key={c.label}
                    className="bg-zinc-900/50 border 
                      border-zinc-800 rounded-2xl p-5">
                    <div className="flex items-center 
                      gap-2 mb-3">
                      <Icon size={16}
                        style={{ color: c.color }} />
                      <p className="text-zinc-500 text-xs 
                        uppercase tracking-wider font-bold">
                        {c.label}
                      </p>
                    </div>
                    <p className="font-black text-xl 
                      font-mono"
                      style={{ color: c.color }}>
                      {loading ? '...' : c.value}
                    </p>
                    <p className="text-zinc-600 text-xs mt-1">
                      {c.sub}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* 7-Day Chart */}
            <div className="bg-zinc-900/50 border 
              border-zinc-800 rounded-2xl p-6 mb-6">
              <p className="text-xs font-bold uppercase 
                tracking-widest text-zinc-500 mb-6">
                7-Day Revenue (KES)
              </p>
              <div className="flex items-end gap-3 h-32">
                {weekData.map((day, i) => (
                  <div key={i}
                    className="flex-1 flex flex-col 
                      items-center gap-2">
                    <p className="text-[10px] text-zinc-500 
                      font-mono">
                      {day.amount > 0
                        ? day.amount.toLocaleString()
                        : ''
                      }
                    </p>
                    <div
                      className="w-full rounded-t-lg 
                        bg-green-500/80 min-h-1 transition-all"
                      style={{
                        height: `${Math.max(
                          (day.amount / maxAmount) * 100, 4
                        )}px`,
                        background: i === weekData.length - 1
                          ? '#22c55e' : 'rgba(34,197,94,0.4)'
                      }}
                    />
                    <p className="text-[10px] text-zinc-500">
                      {day.date}
                    </p>
                    {day.count > 0 && (
                      <p className="text-[10px] text-green-400 
                        font-bold">
                        {day.count}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Signal Type Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  type: 'football', emoji: '⚽',
                  label: 'Football Signals',
                  color: '#22c55e', rev: footballRev,
                  count: completed.filter(
                    p => p.signal_type === 'football'
                  ).length
                },
                {
                  type: 'aviator', emoji: '✈️',
                  label: 'Aviator Signals',
                  color: '#f87171', rev: aviatorRev,
                  count: completed.filter(
                    p => p.signal_type === 'aviator'
                  ).length
                },
              ].map(item => (
                <div key={item.type}
                  className="bg-zinc-900/50 border 
                    border-zinc-800 rounded-2xl p-5">
                  <p className="text-2xl mb-3">{item.emoji}</p>
                  <p className="font-bold text-sm mb-1">
                    {item.label}
                  </p>
                  <p className="font-black text-2xl font-mono"
                    style={{ color: item.color }}>
                    KES {item.rev.toLocaleString()}
                  </p>
                  <p className="text-zinc-500 text-xs mt-1">
                    {item.count} completed sales
                  </p>
                  <div className="mt-3 h-1.5 bg-zinc-800 
                    rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${totalRev > 0
                          ? (item.rev / totalRev) * 100
                          : 0
                        }%`,
                        background: item.color
                      }}
                    />
                  </div>
                  <p className="text-zinc-600 text-xs mt-1">
                    {totalRev > 0
                      ? ((item.rev / totalRev) * 100).toFixed(1)
                      : 0
                    }% of total
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* TRANSACTIONS TAB */}
        {tab === 'transactions' && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="flex items-center gap-2 
                bg-zinc-900 border border-zinc-800 
                rounded-xl px-3 py-2 flex-1 min-w-48">
                <Search size={14} className="text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search reference or plan..."
                  className="bg-transparent text-white text-sm 
                    outline-none w-full placeholder:text-zinc-600"
                />
              </div>
              <select
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 
                  text-white text-xs rounded-xl px-3 py-2 
                  outline-none"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 
                  text-white text-xs rounded-xl px-3 py-2 
                  outline-none"
              >
                <option value="all">All Types</option>
                <option value="football">Football</option>
                <option value="aviator">Aviator</option>
              </select>
            </div>

            <p className="text-xs text-zinc-500 mb-3">
              Showing {filtered.length} of{' '}
              {purchases.length} transactions
            </p>

            {/* Table */}
            <div className="bg-zinc-900/50 border 
              border-zinc-800 rounded-2xl overflow-hidden">
              <div className="grid grid-cols-6 gap-4 px-4 
                py-3 border-b border-zinc-800">
                {[
                  'Reference', 'Type', 'Plan',
                  'Amount', 'Status', 'Date'
                ].map(h => (
                  <p key={h} className="text-[10px] font-bold 
                    uppercase tracking-wider text-zinc-500">
                    {h}
                  </p>
                ))}
              </div>
              <div className="divide-y divide-zinc-800/50 
                max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center 
                    text-zinc-500 animate-pulse text-xs">
                    Loading...
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-8 text-center 
                    text-zinc-600 text-xs">
                    No transactions found
                  </div>
                ) : filtered.map(p => (
                  <div key={p.id}
                    className="grid grid-cols-6 gap-4 
                      px-4 py-3 hover:bg-zinc-800/30">
                    <p className="text-xs font-mono 
                      text-zinc-400 truncate">
                      {p.reference?.slice(-12) || '-'}
                    </p>
                    <p className="text-xs">
                      {p.signal_type === 'football'
                        ? '⚽' : '✈️'
                      }{' '}
                      {p.signal_type}
                    </p>
                    <p className="text-xs text-zinc-300 
                      truncate">
                      {p.plan || '-'}
                    </p>
                    <p className="text-xs font-mono 
                      font-bold text-green-400">
                      {p.currency || 'KES'}{' '}
                      {(p.amount || 0).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1">
                      {p.status === 'completed'
                        ? <CheckCircle size={12}
                          className="text-green-400" />
                        : p.status === 'pending'
                        ? <Clock size={12}
                          className="text-yellow-400" />
                        : <XCircle size={12}
                          className="text-red-400" />
                      }
                      <span className={`text-[10px] 
                        font-bold ${
                        p.status === 'completed'
                          ? 'text-green-400'
                          : p.status === 'pending'
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {new Date(p.created_at)
                        .toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ANALYTICS TAB */}
        {tab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 
            gap-6">

            {/* Conversion Rate */}
            <div className="bg-zinc-900/50 border 
              border-zinc-800 rounded-2xl p-6">
              <p className="text-xs font-bold uppercase 
                tracking-widest text-zinc-500 mb-5">
                Conversion Rate
              </p>
              {[
                {
                  label: 'Completed',
                  count: purchases.filter(
                    p => p.status === 'completed'
                  ).length,
                  color: '#22c55e'
                },
                {
                  label: 'Pending',
                  count: purchases.filter(
                    p => p.status === 'pending'
                  ).length,
                  color: '#fbbf24'
                },
                {
                  label: 'Failed',
                  count: purchases.filter(
                    p => p.status === 'failed'
                  ).length,
                  color: '#f87171'
                },
              ].map(item => (
                <div key={item.label} className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-zinc-400">
                      {item.label}
                    </span>
                    <span className="text-xs font-bold"
                      style={{ color: item.color }}>
                      {item.count} ({purchases.length > 0
                        ? ((item.count / purchases.length)
                          * 100).toFixed(1)
                        : 0
                      }%)
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-800 
                    rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${purchases.length > 0
                          ? (item.count / purchases.length)
                            * 100
                          : 0
                        }%`,
                        background: item.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Average Sale */}
            <div className="bg-zinc-900/50 border 
              border-zinc-800 rounded-2xl p-6">
              <p className="text-xs font-bold uppercase 
                tracking-widest text-zinc-500 mb-5">
                Key Metrics
              </p>
              {[
                {
                  label: 'Avg Sale Value',
                  value: completed.length > 0
                    ? `KES ${Math.floor(
                      totalRev / completed.length
                    ).toLocaleString()}`
                    : 'KES 0',
                  color: '#22c55e'
                },
                {
                  label: 'Total Signals Sold',
                  value: completed.reduce(
                    (s, p) => s + (p.signals_count || 1), 0
                  ).toLocaleString(),
                  color: '#60a5fa'
                },
                {
                  label: 'Best Day Revenue',
                  value: `KES ${Math.max(
                    ...weekData.map(d => d.amount), 0
                  ).toLocaleString()}`,
                  color: '#fbbf24'
                },
                {
                  label: 'This Week Revenue',
                  value: `KES ${weekData.reduce(
                    (s, d) => s + d.amount, 0
                  ).toLocaleString()}`,
                  color: '#a78bfa'
                },
              ].map(m => (
                <div key={m.label}
                  className="flex justify-between 
                    items-center py-3 border-b 
                    border-zinc-800 last:border-0">
                  <p className="text-xs text-zinc-400">
                    {m.label}
                  </p>
                  <p className="font-black text-sm font-mono"
                    style={{ color: m.color }}>
                    {m.value}
                  </p>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}