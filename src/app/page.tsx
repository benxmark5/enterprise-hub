"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/supabase';
import {
  Target, ShoppingBag, Zap, BarChart3,
  Users, TrendingUp, DollarSign,
  Activity, ArrowRight, RefreshCw, Bell
} from 'lucide-react';

type Purchase = {
  id: string;
  amount: number;
  currency: string;
  plan: string;
  signal_type: string;
  signals_count: number;
  status: string;
  created_at: string;
};

type Stats = {
  totalRevenue: number;
  todayRevenue: number;
  totalCustomers: number;
  newToday: number;
  activeSignals: number;
  totalPurchases: number;
  footballSales: number;
  aviatorSales: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0, todayRevenue: 0,
    totalCustomers: 0, newToday: 0,
    activeSignals: 0, totalPurchases: 0,
    footballSales: 0, aviatorSales: 0,
  });
  const [recentPurchases, setRecentPurchases] =
    useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAlert, setNewAlert] = useState<Purchase | null>(null);

  const load = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    const [{ data: purchases }, { data: markets }] =
      await Promise.all([
        supabase.from('purchases').select('*')
          .order('created_at', { ascending: false }),
        supabase.from('markets').select('*').eq('is_live', true),
      ]);

    const all = purchases || [];
    const completed = all.filter(p => p.status === 'completed');
    const todayP = completed.filter(
      p => p.created_at?.startsWith(today)
    );

    // Try to get user count
    let userCount = 0;
    let newTodayCount = 0;
    try {
      const { data: authData } =
        await supabase.auth.admin.listUsers();
      userCount = authData?.users?.length || 0;
      newTodayCount = (authData?.users || []).filter(
        (u: { created_at: string }) =>
          u.created_at?.startsWith(today)
      ).length;
    } catch {
      // admin API might not be available
    }

    setStats({
      totalRevenue: completed.reduce(
        (s, p) => s + (p.amount || 0), 0
      ),
      todayRevenue: todayP.reduce(
        (s, p) => s + (p.amount || 0), 0
      ),
      totalCustomers: userCount,
      newToday: newTodayCount,
      activeSignals: markets?.length || 0,
      totalPurchases: completed.length,
      footballSales: completed.filter(
        p => p.signal_type === 'football'
      ).length,
      aviatorSales: completed.filter(
        p => p.signal_type === 'aviator'
      ).length,
    });

    setRecentPurchases(all.slice(0, 10));
    setLoading(false);
  };

  useEffect(() => {
    load();

    // Real-time listener for new purchases
    const channel = supabase
      .channel('purchases-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'purchases',
          filter: 'status=eq.completed'
        },
        (payload) => {
          const newPurchase = payload.new as Purchase;
          // Show alert
          setNewAlert(newPurchase);
          setTimeout(() => setNewAlert(null), 8000);
          // Reload stats
          load();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'purchases',
        },
        () => { load(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const modules = [
    { href: '/odds-master', icon: Target, label: 'ODDS_MASTER',
      desc: 'Analyze matches & dispatch signals',
      color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',
      border: 'rgba(251,191,36,0.2)' },
    { href: '/aviator', icon: Zap, label: 'AVIATOR_CMD',
      desc: 'AI pattern analysis & dispatch',
      color: '#f87171', bg: 'rgba(248,113,113,0.1)',
      border: 'rgba(248,113,113,0.2)' },
    { href: '/inventory', icon: BarChart3, label: 'INVENTORY_CMD',
      desc: 'Sales, payments & analytics',
      color: '#22c55e', bg: 'rgba(34,197,94,0.1)',
      border: 'rgba(34,197,94,0.2)' },
    { href: '/customers', icon: Users, label: 'CUSTOMERS',
      desc: 'View & manage all customers',
      color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',
      border: 'rgba(96,165,250,0.2)' },
    { href: '/sports-odds', icon: TrendingUp, label: 'SPORTS_ODDS',
      desc: 'Live match browser',
      color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',
      border: 'rgba(167,139,250,0.2)' },
    { href: '/ticketing', icon: ShoppingBag, label: 'TICKETING',
      desc: 'Market control center',
      color: '#34d399', bg: 'rgba(52,211,153,0.1)',
      border: 'rgba(52,211,153,0.2)' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6">
      <div className="max-w-7xl mx-auto">

        {/* NEW PURCHASE ALERT */}
        {newAlert && (
          <div style={{
            position: 'fixed', top: '20px', right: '20px',
            zIndex: 1000,
            background: 'linear-gradient(135deg,#0f1f33,#1a2740)',
            border: '2px solid #22c55e',
            borderRadius: '16px', padding: '16px 20px',
            boxShadow: '0 8px 30px rgba(34,197,94,0.3)',
            maxWidth: '320px', animation: 'slideIn 0.3s ease'
          }}>
            <div style={{
              display: 'flex', gap: '12px', alignItems: 'flex-start'
            }}>
              <span style={{ fontSize: '28px' }}>💰</span>
              <div>
                <p style={{
                  fontWeight: 900, fontSize: '14px',
                  color: '#22c55e', marginBottom: '4px'
                }}>
                  New Payment Received!
                </p>
                <p style={{
                  color: 'white', fontSize: '13px',
                  marginBottom: '2px'
                }}>
                  {newAlert.signal_type === 'football' ? '⚽' : '✈️'}{' '}
                  {newAlert.plan || 'Signal'}
                </p>
                <p style={{
                  color: '#22c55e', fontWeight: 900,
                  fontFamily: 'monospace'
                }}>
                  {newAlert.currency} {newAlert.amount?.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-yellow-500 uppercase italic">
              GLOBAL HUB
            </h1>
            <p className="text-zinc-500 text-xs uppercase tracking-widest mt-1">
              Admin Control Center //
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric'
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: '10px', padding: '6px 12px'
            }}>
              <span style={{
                width: '8px', height: '8px',
                background: '#22c55e', borderRadius: '50%'
              }} />
              <span style={{
                color: '#22c55e', fontSize: '11px', fontWeight: 700
              }}>
                LIVE
              </span>
            </div>
            <button onClick={load} disabled={loading}
              className="flex items-center gap-2 text-zinc-500 hover:text-white border border-zinc-800 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Revenue', value: `KES ${stats.totalRevenue.toLocaleString()}`, sub: `Today: KES ${stats.todayRevenue.toLocaleString()}`, icon: DollarSign, color: '#22c55e' },
            { label: 'Total Customers', value: stats.totalCustomers || stats.totalPurchases, sub: `${stats.newToday} new today`, icon: Users, color: '#60a5fa' },
            { label: 'Total Sales', value: stats.totalPurchases, sub: `⚽ ${stats.footballSales} · ✈️ ${stats.aviatorSales}`, icon: ShoppingBag, color: '#fbbf24' },
            { label: 'Live Signals', value: stats.activeSignals, sub: 'Currently dispatched', icon: Activity, color: '#f87171' },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label}
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div style={{
                    background: `${card.color}20`,
                    padding: '10px', borderRadius: '10px'
                  }}>
                    <Icon size={20} style={{ color: card.color }} />
                  </div>
                </div>
                <p className="font-black text-2xl font-mono mb-1"
                  style={{ color: card.color }}>
                  {loading ? '...' : card.value}
                </p>
                <p className="text-zinc-500 text-xs uppercase tracking-wider">
                  {card.label}
                </p>
                <p className="text-zinc-600 text-xs mt-1">{card.sub}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Modules */}
          <div className="lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
              Control Modules
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {modules.map(m => {
                const Icon = m.icon;
                return (
                  <Link key={m.href} href={m.href}
                    className="block p-4 rounded-xl border hover:scale-105 transition-all"
                    style={{ background: m.bg, borderColor: m.border }}>
                    <Icon size={22} className="mb-3"
                      style={{ color: m.color }} />
                    <p className="font-black text-xs uppercase tracking-wider mb-1"
                      style={{ color: m.color }}>
                      {m.label}
                    </p>
                    <p className="text-zinc-500 text-xs leading-relaxed">
                      {m.desc}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Live Purchases Feed */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <span style={{
                  width: '8px', height: '8px',
                  background: '#22c55e', borderRadius: '50%',
                  display: 'inline-block'
                }} />
                Live Sales Feed
              </p>
              <Link href="/inventory"
                className="text-xs text-yellow-500 hover:text-yellow-400 flex items-center gap-1">
                View All <ArrowRight size={12} />
              </Link>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-zinc-600 text-xs animate-pulse">
                  Loading...
                </div>
              ) : recentPurchases.length === 0 ? (
                <div className="p-8 text-center text-zinc-600 text-xs">
                  No sales yet today
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {recentPurchases.map(p => (
                    <div key={p.id}
                      className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate text-white">
                          {p.signal_type === 'football' ? '⚽' : '✈️'}{' '}
                          {p.plan || 'Signal'}
                        </p>
                        <p className="text-zinc-600 text-[10px] mt-0.5">
                          {new Date(p.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black font-mono text-green-400">
                          {p.currency || 'KES'} {(p.amount || 0).toLocaleString()}
                        </p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}