'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/supabase';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Ticket,
  DollarSign,
  Activity,
  Zap,
  Gamepad2,
  RefreshCw,
  Loader2,
  ArrowRight,
  Eye,
  Star,
  Clock,
  Sparkles,
  Crown,
  Shield,
  Award,
  Target,
  BarChart3,
  Settings as SettingsIcon
} from 'lucide-react';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    events: 0,
    tickets: 0,
    revenue: 0,
    orders: 0,
    liveEvents: 0,
    publishedEvents: 0,
    users: 0,
    signals: 0,
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
        orders: ordersCount || 0,
        liveEvents: liveCount || 0,
        publishedEvents: publishedCount || 0,
        users: usersCount || 0,
        signals: signalsCount || 0,
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
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Total Events',
      value: stats.events,
      icon: Calendar,
      gradient: 'from-blue-500 to-indigo-500',
    },
    {
      title: 'Tickets Sold',
      value: stats.tickets,
      icon: Ticket,
      gradient: 'from-yellow-500 to-orange-500',
    },
    {
      title: 'Live Signals',
      value: stats.signals,
      icon: Zap,
      gradient: 'from-red-500 to-pink-500',
    },
  ];

  const quickActions = [
    { title: 'Create Event', icon: Calendar, href: '/events/new', gradient: 'from-blue-500 to-indigo-500' },
    { title: 'Manage Tickets', icon: Ticket, href: '/ticketing', gradient: 'from-yellow-500 to-orange-500' },
    { title: 'Aviator Signals', icon: Zap, href: '/aviator', gradient: 'from-red-500 to-pink-500' },
    { title: 'Crash Game', icon: Gamepad2, href: '/crash-game', gradient: 'from-purple-500 to-violet-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl glass p-8 animate-fade-in">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles size={20} className="text-yellow-400 animate-pulse" />
              <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Welcome Back</span>
            </div>
            <h1 className="text-3xl font-black gradient-text">Global Hub Admin</h1>
            <p className="text-white/40 text-sm mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={loadStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl glass hover:bg-white/5 transition disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="glass-card p-6 hover:glass-card-hover transition-all duration-300 animate-fade-in"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/40 font-light">{card.title}</p>
                  <p className="text-2xl font-black text-white mt-1">
                    {loading ? <Loader2 className="animate-spin inline" size={20} /> : card.value}
                  </p>
                </div>
                <div className={`p-2 rounded-xl bg-gradient-to-br ${card.gradient} bg-opacity-10`}>
                  <Icon size={18} className="text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-medium text-white/40 mb-4 flex items-center gap-2">
          <Sparkles size={14} className="text-yellow-400" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} href={action.href}>
                <div className="glass-card p-4 hover:glass-card-hover transition-all duration-300 cursor-pointer group">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-2 group-hover:scale-110 transition`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <p className="font-semibold text-sm">{action.title}</p>
                  <p className="text-xs text-white/30">Click to manage</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white/40 flex items-center gap-2">
              <Clock size={14} />
              Recent Activity
            </h3>
            <button className="text-xs text-white/20 hover:text-white/40 transition">View All</button>
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl glass hover:bg-white/5 transition">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                  <Activity size={14} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white/80">New event created: "Champions League Final"</p>
                  <p className="text-xs text-white/30">2 minutes ago</p>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white/40 flex items-center gap-2">
              <Target size={14} />
              Quick Overview
            </h3>
            <button className="text-xs text-white/20 hover:text-white/40 transition">
              <RefreshCw size={12} onClick={loadStats} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Total Users', value: stats.users, icon: Users },
              { label: 'Total Events', value: stats.events, icon: Calendar },
              { label: 'Tickets Sold', value: stats.tickets, icon: Ticket },
              { label: 'Live Signals', value: stats.signals, icon: Zap },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-xl glass hover:bg-white/5 transition">
                  <div className="flex items-center gap-3">
                    <Icon size={14} className="text-white/40" />
                    <span className="text-sm text-white/60">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {loading ? <Loader2 className="animate-spin" size={14} /> : item.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}