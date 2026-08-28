"use client";
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/supabase';
import {
  Target, ShoppingBag, Zap, BarChart3,
  Users, TrendingUp, DollarSign, Activity,
  ArrowRight, RefreshCw, Globe, Eye,
  Bell, ShoppingCart, UserPlus, CreditCard, Ticket
} from 'lucide-react';

type ActivityItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  country: string;
  country_flag: string;
  created_at: string;
};

type VisitStat = {
  country: string;
  count: number;
  flag: string;
};

type Purchase = {
  id: string;
  amount: number;
  currency: string;
  plan: string;
  signal_type: string;
  status: string;
  created_at: string;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    todayVisitors: 0,
    totalVisitors: 0,
    todayOrders: 0,
    todayRevenue: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    activeSignals: 0,
    footballSales: 0,
    aviatorSales: 0,
  });
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [topCountries, setTopCountries] = useState<VisitStat[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<ActivityItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const load = async () => {
    setLoading(true);
    try {
      const [
        { data: visits },
        { data: todayVisits },
        { data: purchases },
        { data: markets },
        { data: feed },
      ] = await Promise.all([
        supabase.from('website_visits').select('country, country_flag:currency').limit(500),
        supabase.from('website_visits').select('id').gte('created_at', `${today}T00:00:00`),
        supabase.from('purchases').select('*').order('created_at', { ascending: false }),
        supabase.from('markets').select('id').eq('is_live', true),
        supabase.from('activity_feed').select('*')
          .order('created_at', { ascending: false }).limit(30),
      ]);

      const allPurchases = purchases || [];
      const completed = allPurchases.filter(p => p.status === 'completed');
      const todayCompleted = completed.filter(
        p => p.created_at?.startsWith(today)
      );

      // Top countries from visits
      const countryCount: Record<string, number> = {};
      (visits || []).forEach((v: { country: string }) => {
        countryCount[v.country] = (countryCount[v.country] || 0) + 1;
      });
      const topC = Object.entries(countryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([country, count]) => ({ country, count, flag: getFlag(country) }));

      setStats({
        todayVisitors: todayVisits?.length || 0,
        totalVisitors: visits?.length || 0,
        todayOrders: todayCompleted.length,
        todayRevenue: todayCompleted.reduce((s, p) => s + (p.amount || 0), 0),
        totalRevenue: completed.reduce((s, p) => s + (p.amount || 0), 0),
        pendingOrders: allPurchases.filter(p => p.status === 'pending').length,
        completedOrders: completed.length,
        activeSignals: markets?.length || 0,
        footballSales: completed.filter(p => p.signal_type === 'football').length,
        aviatorSales: completed.filter(p => p.signal_type === 'aviator').length,
      });

      setTopCountries(topC);
      setActivityFeed(feed || []);
      setRecentPurchases(allPurchases.slice(0, 8));

    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get flag from country name
  const getFlag = (country: string): string => {
    const flags: Record<string, string> = {
      'Kenya': '🇰🇪', 'Nigeria': '🇳🇬', 'Ghana': '🇬🇭',
      'South Africa': '🇿🇦', 'United States': '🇺🇸',
      'United Kingdom': '🇬🇧', 'India': '🇮🇳',
      'Germany': '🇩🇪', 'France': '🇫🇷', 'Brazil': '🇧🇷',
      'Uganda': '🇺🇬', 'Tanzania': '🇹🇿', 'Ethiopia': '🇪🇹',
      'Rwanda': '🇷🇼', 'Botswana': '🇧🇼', 'Zambia': '🇿🇲',
    };
    return flags[country] || '🌍';
  };

  useEffect(() => {
    load();

    // Real-time: purchases
    const purchaseChannel = supabase
      .channel('rt-purchases')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'purchases',
        filter: 'status=eq.completed'
      }, (payload) => {
        const p = payload.new as Purchase;
        const notification: ActivityItem = {
          id: p.id,
          type: 'payment',
          title: `💰 New Payment!`,
          description: `${p.signal_type === 'football' ? '⚽' : '✈️'} ${p.plan || 'Signal'} — ${p.currency} ${p.amount?.toLocaleString()}`,
          country: p.visitor_country || '',
          country_flag: '💳',
          created_at: new Date().toISOString(),
        };
        setNotifications(prev => [notification, ...prev.slice(0, 4)]);
        setUnreadCount(n => n + 1);
        load();
      })
      .subscribe();

    // Real-time: activity feed
    const activityChannel = supabase
      .channel('rt-activity')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_feed',
      }, (payload) => {
        setActivityFeed(prev => [payload.new as ActivityItem, ...prev.slice(0, 29)]);
      })
      .subscribe();

    // Real-time: visitors
    const visitorChannel = supabase
      .channel('rt-visitors')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'website_visits',
      }, () => {
        setStats(prev => ({
          ...prev,
          todayVisitors: prev.todayVisitors + 1,
          totalVisitors: prev.totalVisitors + 1,
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(purchaseChannel);
      supabase.removeChannel(activityChannel);
      supabase.removeChannel(visitorChannel);
    };
  }, []);

  const iconForType = (type: string) => {
    switch (type) {
      case 'payment': return '💰';
      case 'visit': return '👁️';
      case 'register': return '👤';
      case 'order': return '🛒';
      default: return '🔔';
    }
  };

  const modules = [
    { href: '/odds-master', icon: Target, label: 'ODDS_MASTER', desc: 'Analyze & dispatch', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)' },
    { href: '/aviator', icon: Zap, label: 'AVIATOR_CMD', desc: 'AI pattern signals', color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)' },
    { href: '/inventory', icon: BarChart3, label: 'INVENTORY', desc: 'Sales & analytics', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' },
    { href: '/customers', icon: Users, label: 'CUSTOMERS', desc: 'Manage users', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)' },
    { href: '/sports-odds', icon: TrendingUp, label: 'SPORTS_ODDS', desc: 'Live match data', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
    { href: '/ticketing', icon: ShoppingBag, label: 'TICKETING', desc: 'Market control', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
    { href: '/events', icon: Ticket, label: 'EVENTS', desc: 'Stadium tickets & events', color: '#fb923c', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.2)' },
    {
      href: '/withdrawals', icon: DollarSign,
      label: 'WITHDRAWALS',
      desc: 'Approve/reject requests',
      color: '#22c55e', bg: 'rgba(34,197,94,0.1)',
      border: 'rgba(34,197,94,0.2)'
    },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      <div className="max-w-7xl mx-auto p-4">

        {/* Live Payment Notifications */}
        <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notifications.map((n, i) => (
            <div key={n.id} style={{
              background: '#0f1f33',
              border: '2px solid #22c55e',
              borderRadius: '14px', padding: '14px 18px',
              boxShadow: '0 8px 30px rgba(34,197,94,0.25)',
              maxWidth: '280px',
              animation: 'slideIn 0.3s ease',
              display: 'flex', gap: '10px'
            }}>
              <span style={{ fontSize: '22px' }}>{iconForType(n.type)}</span>
              <div>
                <p style={{ fontWeight: 900, fontSize: '13px', color: '#22c55e' }}>{n.title}</p>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{n.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-yellow-500 uppercase italic">
              GLOBAL HUB
            </h1>
            <p className="text-zinc-500 text-xs uppercase tracking-widest mt-1">
              Live Admin Dashboard ·{' '}
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: '10px', padding: '6px 12px'
            }}>
              <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
              <span style={{ color: '#22c55e', fontSize: '11px', fontWeight: 700 }}>LIVE</span>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => setUnreadCount(0)}
                style={{
                  position: 'relative', background: 'rgba(251,191,36,0.1)',
                  border: '1px solid rgba(251,191,36,0.2)',
                  borderRadius: '10px', padding: '6px 12px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  cursor: 'pointer', color: '#fbbf24', fontSize: '12px', fontWeight: 700
                }}>
                <Bell size={14} />
                {unreadCount} new
              </button>
            )}
            <button onClick={load} disabled={loading}
              className="flex items-center gap-2 text-zinc-500 hover:text-white border border-zinc-800 px-4 py-2 rounded-xl text-xs font-bold">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Today's Visitors", value: stats.todayVisitors, sub: `${stats.totalVisitors} total`, icon: Eye, color: '#60a5fa' },
            { label: "Today's Revenue", value: `KES ${stats.todayRevenue.toLocaleString()}`, sub: `${stats.todayOrders} orders`, icon: DollarSign, color: '#22c55e' },
            { label: 'Total Revenue', value: `KES ${stats.totalRevenue.toLocaleString()}`, sub: `${stats.completedOrders} completed`, icon: TrendingUp, color: '#fbbf24' },
            { label: 'Live Signals', value: stats.activeSignals, sub: `⚽${stats.footballSales} ✈️${stats.aviatorSales}`, icon: Activity, color: '#f87171' },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div style={{ background: `${card.color}20`, padding: '8px', borderRadius: '8px' }}>
                    <Icon size={18} style={{ color: card.color }} />
                  </div>
                </div>
                <p className="font-black text-xl font-mono" style={{ color: card.color }}>
                  {loading ? '...' : card.value}
                </p>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider mt-1">{card.label}</p>
                <p className="text-zinc-600 text-[10px] mt-0.5">{card.sub}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

          {/* Modules */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Modules</p>
            <div className="grid grid-cols-2 gap-2">
              {modules.map(m => {
                const Icon = m.icon;
                return (
                  <Link key={m.href} href={m.href}
                    className="block p-3 rounded-xl border hover:scale-105 transition-all"
                    style={{ background: m.bg, borderColor: m.border }}>
                    <Icon size={18} className="mb-2" style={{ color: m.color }} />
                    <p className="font-black text-[10px] uppercase tracking-wider mb-0.5" style={{ color: m.color }}>{m.label}</p>
                    <p className="text-zinc-600 text-[9px]">{m.desc}</p>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Top Countries */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
              Top Visitor Countries
            </p>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
              {topCountries.length === 0 ? (
                <div className="p-6 text-center text-zinc-600 text-xs">No visitor data yet</div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {topCountries.map(c => (
                    <div key={c.country} className="px-4 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{c.flag}</span>
                        <span className="text-xs font-bold text-white">{c.country}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div style={{
                          width: `${Math.min((c.count / Math.max(...topCountries.map(x => x.count))) * 60, 60)}px`,
                          height: '4px', background: '#22c55e', borderRadius: '2px'
                        }} />
                        <span className="text-xs font-bold text-green-400 font-mono">{c.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Live Activity Feed */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <span style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
                Live Activity
              </p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="divide-y divide-zinc-800/50 max-h-64 overflow-y-auto">
                {activityFeed.length === 0 ? (
                  <div className="p-6 text-center text-zinc-600 text-xs">
                    Activity will appear here in real-time
                  </div>
                ) : (
                  activityFeed.map(item => (
                    <div key={item.id} className="px-3 py-2.5 flex items-start gap-2">
                      <span className="text-base flex-shrink-0 mt-0.5">
                        {iconForType(item.type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{item.title}</p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">{item.description}</p>
                        <p className="text-[9px] text-zinc-700 mt-0.5">
                          {new Date(item.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Sales */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Recent Sales
            </p>
            <Link href="/inventory" className="text-xs text-yellow-500 flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="divide-y divide-zinc-800">
              {recentPurchases.length === 0 ? (
                <div className="p-6 text-center text-zinc-600 text-xs">No sales yet</div>
              ) : recentPurchases.map(p => (
                <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-lg flex-shrink-0">
                      {p.signal_type === 'football' ? '⚽' : '✈️'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {p.plan || 'Signal'}
                      </p>
                      <p className="text-zinc-600 text-[10px]">
                        {new Date(p.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
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