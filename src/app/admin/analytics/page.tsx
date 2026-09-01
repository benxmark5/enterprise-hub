'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { 
  ArrowLeft, RefreshCw, Loader2, 
  TrendingUp, TrendingDown, Users, DollarSign,
  Calendar, Download, Filter, BarChart3,
  PieChart, Activity, Clock, Zap,
  Ticket, ShoppingBag
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

      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: eventsCount } = await supabase
        .from('stadium_events')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false);

      const { count: ticketsCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true });

      const { data: ordersData } = await supabase
        .from('ticket_orders')
        .select('total_amount')
        .eq('status', 'completed');

      const totalRevenue = ordersData?.reduce((acc, o) => acc + (o.total_amount || 0), 0) || 0;

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
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { title: 'Total Events', value: stats.totalEvents, icon: Calendar, color: 'text-green-400', bg: 'bg-green-500/10' },
    { title: 'Total Tickets', value: stats.totalTickets, icon: Ticket, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { title: 'Total Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { title: 'Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { title: 'Events This Month', value: stats.eventsThisMonth, icon: Activity, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <Link href="/admin">
            <button className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition">
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
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-zinc-500">{card.title}</p>
                    <p className="text-xl font-black mt-1">
                      {loading ? <Loader2 className="animate-spin inline" size={16} /> : card.value}
                    </p>
                  </div>
                  <div className={`p-2 ${card.bg} rounded-xl ${card.color}`}>
                    <Icon size={18} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-zinc-400 mb-4">Revenue Overview</h3>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500">Revenue chart coming soon</p>
                <p className="text-sm text-zinc-600">Connect your payment provider</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
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