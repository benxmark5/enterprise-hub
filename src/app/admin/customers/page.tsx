'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import {
  Search, RefreshCw, Loader2, Users, Eye, AlertCircle,
  Crown, Star, User as UserIcon, UserX,
  Activity, TrendingUp, Wallet,
} from 'lucide-react';

type Customer = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  joined_at: string;
  last_seen_at: string | null;
  wallet_balance_usd: number;
  pending_balance_usd: number;
  total_deposited_usd: number;
  total_withdrawn_usd: number;
  deposit_count: number;
  withdrawal_count: number;
  last_transaction_at: string | null;
  customer_tier: 'vip' | 'regular' | 'small' | 'never_deposited';
  activity_status: 'active_today' | 'active_this_week' | 'active_this_month' | 'dormant';
};

type TierSummary = {
  customer_tier: string;
  customer_count: number;
  total_balance_usd: number;
  total_deposited_usd: number;
  total_withdrawn_usd: number;
};

type TierFilter = 'all' | 'vip' | 'regular' | 'small' | 'never_deposited';
type SortKey = 'joined' | 'deposits' | 'balance' | 'last_tx';

export default function CustomersPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tiers, setTiers] = useState<TierSummary[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('joined');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [customersRes, tiersRes] = await Promise.all([
        supabase
          .from('admin_customer_profile')
          .select('*'),
        supabase
          .from('admin_customer_tier_summary')
          .select('*'),
      ]);

      if (customersRes.error) throw customersRes.error;
      if (tiersRes.error) throw tiersRes.error;

      setCustomers((customersRes.data ?? []) as Customer[]);
      setTiers((tiersRes.data ?? []) as TierSummary[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Derived stats
  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter(c =>
      c.activity_status === 'active_today' || c.activity_status === 'active_this_week'
    ).length;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newThisWeek = customers.filter(c =>
      new Date(c.joined_at) > weekAgo
    ).length;
    const totalBalance = customers.reduce((s, c) => s + c.wallet_balance_usd, 0);
    const totalDeposits = customers.reduce((s, c) => s + c.total_deposited_usd, 0);
    return { total, active, newThisWeek, totalBalance, totalDeposits };
  }, [customers]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();

    let list = customers.filter(c => {
      const matchSearch =
        !s ||
        c.email?.toLowerCase().includes(s) ||
        c.full_name?.toLowerCase().includes(s);

      const matchTier =
        tierFilter === 'all' || c.customer_tier === tierFilter;

      return matchSearch && matchTier;
    });

    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'deposits':
          return b.total_deposited_usd - a.total_deposited_usd;
        case 'balance':
          return b.wallet_balance_usd - a.wallet_balance_usd;
        case 'last_tx': {
          const at = a.last_transaction_at ? new Date(a.last_transaction_at).getTime() : 0;
          const bt = b.last_transaction_at ? new Date(b.last_transaction_at).getTime() : 0;
          return bt - at;
        }
        case 'joined':
        default:
          return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime();
      }
    });

    return list;
  }, [customers, search, tierFilter, sortKey]);

  const tierBadge = (tier: Customer['customer_tier']) => {
    switch (tier) {
      case 'vip':
        return {
          label: 'VIP',
          icon: Crown,
          className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        };
      case 'regular':
        return {
          label: 'Regular',
          icon: Star,
          className: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        };
      case 'small':
        return {
          label: 'Small',
          icon: UserIcon,
          className: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        };
      default:
        return {
          label: 'Never Deposited',
          icon: UserX,
          className: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
        };
    }
  };

  const activityBadge = (status: Customer['activity_status']) => {
    switch (status) {
      case 'active_today':
        return { label: 'Active today', color: 'text-emerald-400', dot: 'bg-emerald-400' };
      case 'active_this_week':
        return { label: 'This week', color: 'text-emerald-300', dot: 'bg-emerald-300' };
      case 'active_this_month':
        return { label: 'This month', color: 'text-amber-300', dot: 'bg-amber-300' };
      default:
        return { label: 'Dormant', color: 'text-zinc-400', dot: 'bg-zinc-500' };
    }
  };

  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <span className="ml-3 text-white/40">Loading customers...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400">{error}</p>
          <button
            onClick={load}
            className="mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-400 rounded-xl text-white font-bold transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users size={22} className="text-purple-400" /> Customers
          </h1>
          <p className="text-sm text-white/40">
            {customers.length} total · {stats.active} active · {stats.newThisWeek} new this week
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Customers"
          value={stats.total.toString()}
          color="text-white"
          icon={<Users size={16} className="text-white/40" />}
        />
        <StatCard
          label="Active This Week"
          value={stats.active.toString()}
          color="text-emerald-400"
          icon={<Activity size={16} className="text-emerald-400" />}
        />
        <StatCard
          label="New This Week"
          value={stats.newThisWeek.toString()}
          color="text-blue-400"
          icon={<TrendingUp size={16} className="text-blue-400" />}
        />
        <StatCard
          label="Total Wallet Holdings"
          value={`$${stats.totalBalance.toFixed(2)}`}
          color="text-amber-400"
          icon={<Wallet size={16} className="text-amber-400" />}
        />
      </div>

      {/* Tier Summary */}
      {tiers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tiers.map((t) => {
            const badge = tierBadge(t.customer_tier as Customer['customer_tier']);
            const Icon = badge.icon;
            return (
              <div
                key={t.customer_tier}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${badge.className}`}
              >
                <Icon size={12} />
                <span>{badge.label}</span>
                <span className="px-1.5 py-0.5 bg-black/30 rounded-md">{t.customer_count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="absolute left-3 top-2.5 text-white/30" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </div>

        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as TierFilter)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer"
        >
          <option value="all">All Tiers</option>
          <option value="vip">VIP</option>
          <option value="regular">Regular</option>
          <option value="small">Small</option>
          <option value="never_deposited">Never Deposited</option>
        </select>

        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer"
        >
          <option value="joined">Sort: Newest First</option>
          <option value="deposits">Sort: Highest Deposits</option>
          <option value="balance">Sort: Highest Balance</option>
          <option value="last_tx">Sort: Most Recent Activity</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Tier</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-white/40 uppercase">Balance</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-white/40 uppercase">Deposited</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-white/40 uppercase">Withdrawn</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Activity</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-white/40 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-white/30">
                    No customers match your filters
                  </td>
                </tr>
              ) : filtered.map((c) => {
                const tier = tierBadge(c.customer_tier);
                const TierIcon = tier.icon;
                const activity = activityBadge(c.activity_status);
                const initial = (c.full_name?.[0] || c.email?.[0] || 'U').toUpperCase();
                return (
                  <tr key={c.user_id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-white truncate">
                            {c.full_name || 'Unnamed'}
                          </p>
                          <p className="text-xs text-white/40 truncate">{c.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${tier.className}`}>
                        <TierIcon size={10} />
                        {tier.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-400 tabular-nums">
                      ${c.wallet_balance_usd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-400 tabular-nums">
                      ${c.total_deposited_usd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-orange-400 tabular-nums">
                      ${c.total_withdrawn_usd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs ${activity.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${activity.dot} animate-pulse`} />
                        {activity.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">
                      {new Date(c.joined_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/customers/${c.user_id}`}>
                        <button className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition">
                          <Eye size={14} className="text-white/40 hover:text-white" />
                        </button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, color, icon,
}: {
  label: string; value: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-white/40 uppercase tracking-wider font-bold">{label}</p>
        {icon}
      </div>
      <p className={`text-2xl font-black ${color} tabular-nums`}>{value}</p>
    </div>
  );
}