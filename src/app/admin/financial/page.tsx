'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  DollarSign, Wallet, TrendingUp, TrendingDown, RefreshCw,
  Loader2, Search, Eye, Users, Activity, CheckCircle, Clock, XCircle,
} from 'lucide-react';

type WalletRow = {
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  available_balance_usd: number;
  pending_balance_usd: number;
  total_deposited_usd: number;
  total_withdrawn_usd: number;
  last_deposit_at: string | null;
  last_withdrawal_at: string | null;
  wallet_created_at: string | null;
  wallet_updated_at: string | null;
};

type DepositRow = {
  id: string;
  reference: string;
  user_email: string | null;
  amount_usd: number;
  amount_kes: number | null;
  purpose: string;
  tx_type: string;
  status: string;
  description: string;
  created_at: string;
};

type Summary = {
  total_deposits_usd: number;
  total_withdrawals_usd: number;
  pending_withdrawals_usd: number;
  total_wallets: number;
  funded_wallets: number;
  today_deposits_usd: number;
  week_deposits_usd: number;
  month_deposits_usd: number;
  expired_pending_count: number;
};

export default function FinancialCenter() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'wallets' | 'deposits'>('wallets');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, walRes, depRes] = await Promise.all([
        supabase.from('admin_revenue_summary').select('*').single(),
        supabase.from('admin_wallet_overview').select('*').order('wallet_updated_at', { ascending: false }),
        supabase.from('admin_recent_deposits').select('*').limit(50),
      ]);

      if (sumRes.data) setSummary(sumRes.data as Summary);
      if (walRes.data) setWallets(walRes.data as WalletRow[]);
      if (depRes.data) setDeposits(depRes.data as DepositRow[]);
    } catch (e) {
      console.error('[financial] load failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000); // auto-refresh every 30s
    return () => clearInterval(id);
  }, [load]);

  const filteredWallets = wallets.filter((w) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      w.user_email?.toLowerCase().includes(s) ||
      w.user_name?.toLowerCase().includes(s) ||
      w.user_id.toLowerCase().includes(s)
    );
  });

  const filteredDeposits = deposits.filter((d) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      d.user_email?.toLowerCase().includes(s) ||
      d.reference.toLowerCase().includes(s)
    );
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'pending':   return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'failed':    return 'text-red-400 bg-red-500/10 border-red-500/20';
      default:          return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <span className="ml-3 text-white/40">Loading financial data...</span>
      </div>
    );
  }

  const s = summary ?? {
    total_deposits_usd: 0, total_withdrawals_usd: 0, pending_withdrawals_usd: 0,
    total_wallets: 0, funded_wallets: 0, today_deposits_usd: 0,
    week_deposits_usd: 0, month_deposits_usd: 0, expired_pending_count: 0,
  };

  const netFlow = s.total_deposits_usd - s.total_withdrawals_usd;
  const totalUserBalances = wallets.reduce((sum, w) => sum + w.available_balance_usd, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign size={22} className="text-emerald-400" /> Financial Center
          </h1>
          <p className="text-sm text-white/40">Platform-wide wallet and payment overview</p>
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

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Deposits"
          value={`$${s.total_deposits_usd.toFixed(2)}`}
          sub={`Today: $${s.today_deposits_usd.toFixed(2)}`}
          color="text-emerald-400"
          icon={<TrendingUp size={16} className="text-emerald-400" />}
        />
        <StatCard
          label="Total Withdrawals"
          value={`$${s.total_withdrawals_usd.toFixed(2)}`}
          sub={`Pending: $${s.pending_withdrawals_usd.toFixed(2)}`}
          color="text-red-400"
          icon={<TrendingDown size={16} className="text-red-400" />}
        />
        <StatCard
          label="Net Flow"
          value={`${netFlow >= 0 ? '' : '-'}$${Math.abs(netFlow).toFixed(2)}`}
          sub="Deposits − Withdrawals"
          color={netFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}
          icon={<Activity size={16} className="text-white/40" />}
        />
        <StatCard
          label="User Wallets"
          value={`${s.total_wallets}`}
          sub={`${s.funded_wallets} funded · $${totalUserBalances.toFixed(2)} held`}
          color="text-blue-400"
          icon={<Wallet size={16} className="text-blue-400" />}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Deposits This Week" value={`$${s.week_deposits_usd.toFixed(2)}`} />
        <MiniStat label="Deposits This Month" value={`$${s.month_deposits_usd.toFixed(2)}`} />
        <MiniStat label="Pending Withdrawals" value={`$${s.pending_withdrawals_usd.toFixed(2)}`} />
        <MiniStat
          label="Expired Pending"
          value={`${s.expired_pending_count}`}
          color={s.expired_pending_count > 0 ? 'text-red-400' : 'text-white/60'}
        />
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="absolute left-3 top-2.5 text-white/30" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, name, or reference..."
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('wallets')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
              tab === 'wallets'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-white/5 text-white/50 hover:text-white border border-white/5'
            }`}
          >
            <Wallet size={14} className="inline mr-1.5" /> Wallets ({wallets.length})
          </button>
          <button
            onClick={() => setTab('deposits')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
              tab === 'deposits'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-white/5 text-white/50 hover:text-white border border-white/5'
            }`}
          >
            <TrendingUp size={14} className="inline mr-1.5" /> Deposits ({deposits.length})
          </button>
        </div>
      </div>

      {/* Tables */}
      {tab === 'wallets' ? (
        <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">User</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-white/40 uppercase">Available</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-white/40 uppercase">Pending</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-white/40 uppercase">Deposited</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-white/40 uppercase">Withdrawn</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredWallets.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">No wallets found</td></tr>
                ) : filteredWallets.map((w) => (
                  <tr key={w.user_id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-white">{w.user_name || 'Unknown'}</p>
                      <p className="text-xs text-white/40">{w.user_email || w.user_id.slice(0, 8)}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-400">
                      ${w.available_balance_usd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-400">
                      ${w.pending_balance_usd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-white/60">
                      ${w.total_deposited_usd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-white/60">
                      ${w.total_withdrawn_usd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">
                      {w.last_deposit_at
                        ? new Date(w.last_deposit_at).toLocaleString()
                        : w.wallet_updated_at
                          ? new Date(w.wallet_updated_at).toLocaleString()
                          : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">User</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-white/40 uppercase">USD</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-white/40 uppercase">KES</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredDeposits.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">No deposits found</td></tr>
                ) : filteredDeposits.map((d) => (
                  <tr key={d.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3 text-xs text-white/50 font-mono">{d.reference}</td>
                    <td className="px-4 py-3 text-xs text-white/70">{d.user_email || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-400">
                      ${d.amount_usd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-white/40 text-xs">
                      {d.amount_kes ? `KES ${d.amount_kes.toFixed(0)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${statusBadge(d.status)}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">
                      {new Date(d.created_at).toLocaleString()}
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

// ------------------------------------------------------------
function StatCard({
  label, value, sub, color, icon,
}: {
  label: string; value: string; sub: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-white/40 uppercase tracking-wider font-bold">{label}</p>
        {icon}
      </div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-xs text-white/30 mt-1">{sub}</p>
    </div>
  );
}

function MiniStat({ label, value, color = 'text-white/60' }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
      <p className="text-xs text-white/40">{label}</p>
      <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}