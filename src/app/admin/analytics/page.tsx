'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/supabase';
import { 
  ArrowLeft, RefreshCw, Loader2, 
  TrendingUp, TrendingDown, Users, DollarSign,
  Calendar, Download, Filter, BarChart3,
  PieChart, Activity, Clock, Zap
} from 'lucide-react';

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEvents: 0,
    totalTickets: 0,
    totalRevenue: 0,
    totalOrders: 0,
    activeUsers: 0,
    eventsThisMonth: 0,
    revenueThisMonth: 0,
  });

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Get total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total events
      const { count: eventsCount } = await supabase
        .from('stadium_events')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false);

      // Get total tickets
      const { count: ticketsCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true });

      // Get revenue
      const { data: ordersData } = await supabase
        .from('ticket_orders')
        .select('total_amount')
        .eq('status', 'completed');

      const totalRevenue = ordersData?.reduce((acc, o) => acc + (o.total_amount || 0), 0) || 0;

      // Get this month's events
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: eventsThisMonth } = await supabase
        .from('stadium_events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())
        .eq('is_deleted', false);

      setStats({
        totalUsers: usersCount || 0,
        totalEvents: eventsCount || 0,
        totalTickets: ticketsCount || 0,
        totalRevenue: totalRevenue,
        totalOrders: ordersData?.length || 0,
        activeUsers: 0,
        eventsThisMonth: eventsThisMonth || 0,
        revenueThisMonth: 0,
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400' },
    { title: 'Total Events', value: stats.totalEvents, icon: Calendar, color: 'text-green-400' },
    { title: 'Total Tickets', value: stats.totalTickets, icon: Ticket, color: 'text-yellow-400' },
    { title: 'Total Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-purple-400' },
    { title: 'Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'text-orange-400' },
    { title: 'Events This Month', value: stats.eventsThisMonth, icon: Activity, color: 'text-pink-400' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <Link href="/admin">
            <button className="p-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition">
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white">📊 Analytics</h1>
            <p className="text-zinc-500 text-sm">Platform analytics and insights</p>
          </div>
          <button
            onClick={loadAnalytics}
            disabled={loading}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-bold transition"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 hover:bg-zinc-900/70 transition">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-zinc-500">{card.title}</p>
                    <p className="text-xl font-black mt-1">
                      {loading ? <Loader2 className="animate-spin inline" size={16} /> : card.value}
                    </p>
                  </div>
                  <div className={`p-2 bg-zinc-800/50 rounded-xl ${card.color}`}>
                    <Icon size={18} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-zinc-400 mb-4">Revenue Overview</h3>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500">Revenue chart coming soon</p>
                <p className="text-sm text-zinc-600">Connect your payment provider</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-zinc-400 mb-4">User Activity</h3>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <Users className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500">User activity chart coming soon</p>
                <p className="text-sm text-zinc-600">Data will appear here</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}