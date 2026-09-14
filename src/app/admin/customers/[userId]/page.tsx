'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import {
  ArrowLeft, Loader2, Mail, Calendar, Wallet, TrendingUp, TrendingDown,
  Crown, Star, User as UserIcon, UserX, Activity, AlertCircle,
  ArrowDownCircle, ArrowUpCircle, CheckCircle, Clock, XCircle,
} from 'lucide-react';

type Profile = {
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

type Tx = {
  id: string;
  reference: string;
  activity_type: string;
  amount_usd: number;
  currency: string;
  status: string;
  description: string;
  created_at: string;
};

type Tab = 'transactions' | 'withdrawals';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [withdrawals, setWithdrawals] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('transactions');

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const [profileRes, txRes, wdRes] = await Promise.all([
        supabase.from('admin_customer_profile').select('*').eq('user_id', userId).single(),
        supabase
          .from('admin_customer_activity_feed')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('admin_withdrawal_history')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (profileRes.error) throw profileRes.error;
      setProfile(profileRes.data as Profile);
      setTransactions((txRes.data ?? []) as Tx[]);
      setWithdrawals(wdRes.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const tierBadge = (tier: Profile['customer_tier']) => {
    switch (tier) {
      case 'vip': return { label: 'VIP', icon: Crown, className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'regular': return { label: 'Regular', icon: Star, className: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
      case 'small': return { label: 'Small', icon: UserIcon, className: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
      default: return { label: 'Never Deposited', icon: UserX, className: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' };
    }
  };

  const activityLabel = (status: Profile['activity_status']) => {
    switch (status) {
      case 'active_today': return { text: 'Active today', color: 'text-emerald-400', dot: 'bg-emerald-400' };
      case 'active_this_week': return { text: 'This week', color: 'text-emerald-300', dot: 'bg-emerald-300' };
      case 'active_this_month': return { text: 'This month', color: 'text-amber-300', dot: 'bg-amber-300' };
      default: return { text: 'Dormant', color: 'text-zinc-400', dot: 'bg-zinc-500' };
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'completed': case 'paid': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'pending': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'failed': case 'rejected': return 'bg-red-500/15 text-red-400 border-red-500/30';
      default: return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <span className="ml-3 text-white/40">Loading customer...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400">{error || 'Customer not found'}</p>
          <button
            onClick={() => router.push('/admin/customers')}
            className="mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-400 rounded-xl text-white font-bold transition"
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  const tier = tierBadge(profile.customer_tier);
  const TierIcon = tier.icon;
  const activity = activityLabel(profile.activity_status);
  const initial = (profile.full_name?.[0] || profile.email?.[0] || 'U').toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/customers">
          <button className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition">
            <ArrowLeft size={18} className="text-white/60" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Customer Detail</h1>
          <p className="text-sm text-white/40">Full account overview and activity</p>
        </div>
      </div>

      {/* Profile card */}
      <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-black text-2xl flex-shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-white">{profile.full_name || 'Unnamed'}</h2>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${tier.className}`}>
                <TierIcon size={10} />
                {tier.label}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-xs ${activity.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${activity.dot} animate-pulse`} />
                {activity.text}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-white/50">
              <Mail size={14} /> {profile.email || '—'}
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-white/40">
              <span className="flex items-center gap-1">
                <Calendar size={12} /> Joined {new Date(profile.joined_at).toLocaleDateString()}
              </span>
              {profile.last_seen_at && (
                <span className="flex items-center gap-1">
                  <Activity size={12} /> Last seen {new Date(profile.last_seen_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Available Balance" value={`$${profile.wallet_balance_usd.toFixed(2)}`} color="text-emerald-400" icon={<Wallet size={16} className="text-emerald-400" />} />
        <Stat label="Pending" value={`$${profile.pending_balance_usd.toFixed(2)}`} color="text-amber-400" icon={<Clock size={16} className="text-amber-400" />} />
        <Stat label="Total Deposited" value={`$${profile.total_deposited_usd.toFixed(2)}`} color="text-blue-400" icon={<TrendingUp size={16} className="text-blue-400" />} sub={`${profile.deposit_count} deposits`} />
        <Stat label="Total Withdrawn" value={`$${profile.total_withdrawn_usd.toFixed(2)}`} color="text-orange-400" icon={<TrendingDown size={16} className="text-orange-400" />} sub={`${profile.withdrawal_count} withdrawals`} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <TabButton active={tab === 'transactions'} onClick={() => setTab('transactions')} icon={<Activity size={14} />}>
          Transactions ({transactions.length})
        </TabButton>
        <TabButton active={tab === 'withdrawals'} onClick={() => setTab('withdrawals')} icon={<ArrowUpCircle size={14} />}>
          Withdrawals ({withdrawals.length})
        </TabButton>
      </div>

      {/* Transactions tab */}
      {tab === 'transactions' && (
        <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-white/40 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-white/30">No transactions</td></tr>
                ) : transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {tx.activity_type === 'deposit' ? (
                          <ArrowDownCircle size={14} className="text-emerald-400" />
                        ) : tx.activity_type === 'withdrawal' ? (
                          <ArrowUpCircle size={14} className="text-red-400" />
                        ) : (
                          <Activity size={14} className="text-blue-400" />
                        )}
                        <span className="text-sm capitalize">{tx.activity_type}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right font-bold tabular-nums ${tx.activity_type === 'deposit' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.activity_type === 'deposit' ? '+' : '-'}${tx.amount_usd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${statusBadge(tx.status)}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40 font-mono truncate max-w-[180px]">{tx.reference}</td>
                    <td className="px-4 py-3 text-xs text-white/40">{new Date(tx.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Withdrawals tab */}
      {tab === 'withdrawals' && (
        <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Reviewed By</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {withdrawals.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-white/30">No withdrawals</td></tr>
                ) : (withdrawals as Array<Record<string, unknown>>).map((w) => (
                  <tr key={w.id as string} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3 font-bold text-orange-400 tabular-nums">
                      ${Number(w.amount_usd ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-white/70">{String(w.payout_method ?? '—')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${statusBadge(String(w.status ?? 'pending'))}`}>
                        {String(w.status ?? 'pending')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">{String(w.reviewed_by ?? '—')}</td>
                    <td className="px-4 py-3 text-xs text-white/40">
                      {w.created_at ? new Date(String(w.created_at)).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label, value, color, icon, sub,
}: {
  label: string; value: string; color: string; icon: React.ReactNode; sub?: string;
}) {
  return (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-white/40 uppercase tracking-wider font-bold">{label}</p>
        {icon}
      </div>
      <p className={`text-2xl font-black ${color} tabular-nums`}>{value}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

function TabButton({
  active, onClick, icon, children,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-bold transition border-b-2 -mb-[1px] flex items-center gap-2 ${
        active
          ? 'text-purple-400 border-purple-400'
          : 'text-white/40 border-transparent hover:text-white/60'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}