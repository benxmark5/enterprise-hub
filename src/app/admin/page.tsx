'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/supabase';
import {
  DollarSign,
  Calendar,
  Ticket,
  Zap,
  Users,
  Activity,
  RefreshCw,
  Loader2,
  Clock,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Plus,
  ChevronRight,
  Crown,
  Shield,
  Target,
  Award,
  Gamepad2,
  BarChart3,
  Settings
} from 'lucide-react';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    events: 0,
    tickets: 0,
    revenue: 0,
    signals: 0,
    users: 0,
    orders: 0,
    liveEvents: 0,
    publishedEvents: 0,
  });

  const loadStats = async () => {
    try {
      setLoading(true);
      
      const { count: eventsCount } = await supabase
        .from('stadium_events')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false);

      const { count: publishedCount } = await supabase
        .from('stadium_events')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true)
        .eq('is_deleted', false);

      const { count: liveCount } = await supabase
        .from('stadium_events')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'live')
        .eq('is_deleted', false);

      const { count: ticketsCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true });

      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { data: ordersData, count: ordersCount } = await supabase
        .from('ticket_orders')
        .select('total_amount', { count: 'exact' })
        .eq('status', 'completed');

      const totalRevenue = ordersData?.reduce((acc, o) => acc + (o.total_amount || 0), 0) || 0;

      const { count: signalsCount } = await supabase
        .from('markets')
        .select('*', { count: 'exact', head: true })
        .eq('is_live', true)
        .eq('league_name', 'AVIATOR');

      setStats({
        events: eventsCount || 0,
        tickets: ticketsCount || 0,
        revenue: totalRevenue,
        signals: signalsCount || 0,
        users: usersCount || 0,
        orders: ordersCount || 0,
        liveEvents: liveCount || 0,
        publishedEvents: publishedCount || 0,
      });

    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${stats.revenue.toFixed(2)}`,
      icon: DollarSign,
      gradient: 'from-emerald-500 to-teal-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      sub: `${stats.orders} orders`,
    },
    {
      title: 'Total Events',
      value: stats.events,
      icon: Calendar,
      gradient: 'from-blue-500 to-cyan-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      sub: `${stats.liveEvents} live now`,
    },
    {
      title: 'Tickets Sold',
      value: stats.tickets,
      icon: Ticket,
      gradient: 'from-amber-500 to-orange-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      sub: `${stats.publishedEvents} published`,
    },
    {
      title: 'Live Signals',
      value: stats.signals,
      icon: Zap,
      gradient: 'from-rose-500 to-pink-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      sub: 'Aviator active',
    },
  ];

  const quickActions = [
    { title: 'Create Event', icon: Plus, href: '/events/new', gradient: 'from-blue-500 to-cyan-400', desc: 'Add new event' },
    { title: 'Manage Tickets', icon: Ticket, href: '/ticketing', gradient: 'from-amber-500 to-orange-400', desc: 'Tier & sales' },
    { title: 'Aviator Signals', icon: Zap, href: '/aviator', gradient: 'from-rose-500 to-pink-400', desc: 'Generate signals' },
    { title: 'Crash Game', icon: Gamepad2, href: '/crash-game', gradient: 'from-purple-500 to-violet-400', desc: 'Admin panel' },
  ];

  const quickOverview = [
    { label: 'Total Users', value: stats.users, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Total Events', value: stats.events, icon: Calendar, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Tickets Sold', value: stats.tickets, icon: Ticket, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Live Signals', value: stats.signals, icon: Zap, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  ];

  const recentActivities = [
    { icon: Calendar, color: 'text-blue-400', title: 'New event created', desc: 'Champions League Final', time: '2 min ago' },
    { icon: Ticket, color: 'text-amber-400', title: 'Ticket order completed', desc: 'VIP Package - 12 tickets', time: '15 min ago' },
    { icon: Zap, color: 'text-rose-400', title: 'Signal dispatched', desc: 'AVIATOR - 10 signals', time: '1 hour ago' },
    { icon: Users, color: 'text-emerald-400', title: 'New user registered', desc: 'john.doe@example.com', time: '2 hours ago' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section - Modern Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/10 via-blue-600/5 to-cyan-600/10 border border-white/5 p-6">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Sparkles size={16} className="text-amber-400 animate-pulse" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Welcome Back</span>
              <span className="px-2 py-0.5 text-[8px] font-bold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                ● Live
              </span>
            </div>
            <h1 className="text-2xl font-black gradient-text-primary">Global Hub Admin</h1>
            <p className="text-white/40 text-sm mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={loadStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition disabled:opacity-50 border border-white/5"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Grid - No Overlap */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`glass-card p-5 ${card.border} border`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/40 font-medium truncate">{card.title}</p>
                  <p className="text-2xl font-bold mt-1.5">
                    {loading ? <Loader2 className="animate-spin inline" size={20} /> : card.value}
                  </p>
                  <p className="text-xs text-white/30 mt-1">{card.sub}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${card.bg} flex-shrink-0 ml-3`}>
                  <Icon size={18} className={`bg-gradient-to-br ${card.gradient} bg-clip-text text-transparent`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-medium text-white/40 mb-3 flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} href={action.href}>
                  <div className="glass-card p-4 hover:glass-card cursor-pointer group transition-all duration-300">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-purple-500/10`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <p className="font-semibold text-sm">{action.title}</p>
                    <p className="text-xs text-white/30">{action.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Overview */}
        <div>
          <h3 className="text-sm font-medium text-white/40 mb-3 flex items-center gap-2">
            <Target size={14} className="text-purple-400" />
            Quick Overview
          </h3>
          <div className="glass-card p-4">
            <div className="space-y-2">
              {quickOverview.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${item.bg}`}>
                        <Icon size={14} className={item.color} />
                      </div>
                      <span className="text-sm text-white/60">{item.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {loading ? <Loader2 className="animate-spin inline" size={14} /> : item.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white/40 flex items-center gap-2">
            <Clock size={14} />
            Recent Activity
          </h3>
          <button className="text-xs text-white/20 hover:text-white/40 transition flex items-center gap-1">
            View All <ChevronRight size={12} />
          </button>
        </div>
        <div className="glass-card p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {recentActivities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={index} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${activity.color} bg-opacity-10 flex items-center justify-center flex-shrink-0`}>
                    <Icon size={14} className={activity.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">{activity.title}</p>
                    <p className="text-xs text-white/40 truncate">{activity.desc}</p>
                  </div>
                  <span className="text-xs text-white/20 flex-shrink-0">{activity.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}