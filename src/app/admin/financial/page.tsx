'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  DollarSign,
  Wallet,
  CreditCard,
  Send,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Calendar,
  Download,
  ChevronRight,
  Users,
  ArrowUp,
  ArrowDown,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'payment';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
};

type FinancialStats = {
  totalBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalTransfers: number;
  pendingCount: number;
  completedCount: number;
  failedCount: number;
  totalUsers: number;
  activeUsers: number;
};

export default function FinancialCenter() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<FinancialStats>({
    totalBalance: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalTransfers: 0,
    pendingCount: 0,
    completedCount: 0,
    failedCount: 0,
    totalUsers: 0,
    activeUsers: 0,
  });
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const loadFinancialData = async () => {
    try {
      setLoading(true);

      // Get all wallet transactions
      const { data: walletTxs, error: walletError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (walletError) throw walletError;

      // Get user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      // Map transactions with user info
      const mappedTxs = (walletTxs || []).map((tx: any) => {
        const user = profiles?.find((p: any) => p.id === tx.user_id);
        return {
          ...tx,
          user_email: user?.email,
          user_name: user?.full_name,
        };
      });

      setTransactions(mappedTxs);

      // Calculate stats
      const deposits = mappedTxs.filter((t: any) => t.type === 'deposit' && t.status === 'completed');
      const withdrawals = mappedTxs.filter((t: any) => t.type === 'withdrawal' && t.status === 'completed');
      const transfers = mappedTxs.filter((t: any) => t.type === 'transfer' && t.status === 'completed');
      const pending = mappedTxs.filter((t: any) => t.status === 'pending');
      const completed = mappedTxs.filter((t: any) => t.status === 'completed');
      const failed = mappedTxs.filter((t: any) => t.status === 'failed');

      const { data: wallets } = await supabase
        .from('wallets')
        .select('available_balance');

      const totalBalance = wallets?.reduce((sum, w) => sum + (w.available_balance || 0), 0) || 0;

      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, created_at');

      const totalUsers = allProfiles?.length || 0;
      const activeUsers = allProfiles?.filter((p: any) => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(p.created_at) > weekAgo;
      }).length || 0;

      setStats({
        totalBalance,
        totalDeposits: deposits.reduce((sum: number, t: any) => sum + t.amount, 0),
        totalWithdrawals: withdrawals.reduce((sum: number, t: any) => sum + t.amount, 0),
        totalTransfers: transfers.reduce((sum: number, t: any) => sum + t.amount, 0),
        pendingCount: pending.length,
        completedCount: completed.length,
        failedCount: failed.length,
        totalUsers,
        activeUsers,
      });

    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredTransactions = transactions.filter((tx) => {
    // Search filter
    const matchSearch = 
      tx.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      tx.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      tx.id.toLowerCase().includes(search.toLowerCase());
    
    // Type filter
    const matchType = filterType === 'all' || tx.type === filterType;
    
    // Status filter
    const matchStatus = filterStatus === 'all' || tx.status === filterStatus;
    
    // Date filter
    let matchDate = true;
    const now = new Date();
    const txDate = new Date(tx.created_at);
    
    switch (dateFilter) {
      case 'today':
        matchDate = txDate.toDateString() === now.toDateString();
        break;
      case 'week':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchDate = txDate >= weekAgo;
        break;
      case 'month':
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        matchDate = txDate >= monthAgo;
        break;
      case 'year':
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        matchDate = txDate >= yearAgo;
        break;
      default:
        matchDate = true;
    }
    
    return matchSearch && matchType && matchStatus && matchDate;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20',
      completed: 'bg-green-500/20 text-green-400 border border-green-500/20',
      failed: 'bg-red-500/20 text-red-400 border border-red-500/20',
      cancelled: 'bg-gray-500/20 text-gray-400 border border-gray-500/20',
    };
    return styles[status] || styles.pending;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <TrendingUp size={16} className="text-green-400" />;
      case 'withdrawal': return <TrendingDown size={16} className="text-red-400" />;
      case 'transfer': return <Send size={16} className="text-blue-400" />;
      case 'payment': return <CreditCard size={16} className="text-purple-400" />;
      default: return <DollarSign size={16} className="text-gray-400" />;
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <span className="ml-3 text-white/40">Loading financial data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">💰 Financial Center</h1>
          <p className="text-sm text-white/40">Complete financial overview and transaction monitoring</p>
        </div>
        <button
          onClick={loadFinancialData}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <p className="text-xs text-white/40 uppercase tracking-wider">Total Balance</p>
          <p className="text-2xl font-bold text-green-400">${stats.totalBalance.toFixed(2)}</p>
          <div className="flex items-center gap-2 mt-1">
            <Users size={12} className="text-white/30" />
            <span className="text-xs text-white/30">{stats.totalUsers} users</span>
            <span className="text-xs text-green-400">• {stats.activeUsers} active</span>
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <p className="text-xs text-white/40 uppercase tracking-wider">Total Deposits</p>
          <p className="text-2xl font-bold text-blue-400">${stats.totalDeposits.toFixed(2)}</p>
          <div className="flex items-center gap-2 mt-1">
            <TrendingUp size={12} className="text-green-400" />
            <span className="text-xs text-green-400">Revenue</span>
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <p className="text-xs text-white/40 uppercase tracking-wider">Total Withdrawals</p>
          <p className="text-2xl font-bold text-orange-400">${stats.totalWithdrawals.toFixed(2)}</p>
          <div className="flex items-center gap-2 mt-1">
            <TrendingDown size={12} className="text-red-400" />
            <span className="text-xs text-red-400">Outflow</span>
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <p className="text-xs text-white/40 uppercase tracking-wider">Net Flow</p>
          <p className={`text-2xl font-bold ${stats.totalDeposits - stats.totalWithdrawals >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${(stats.totalDeposits - stats.totalWithdrawals).toFixed(2)}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Activity size={12} className="text-white/30" />
            <span className="text-xs text-white/30">Platform balance</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
          <p className="text-xs text-white/40">Pending</p>
          <p className="text-xl font-bold text-yellow-400">{stats.pendingCount}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
          <p className="text-xs text-white/40">Completed</p>
          <p className="text-xl font-bold text-green-400">{stats.completedCount}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
          <p className="text-xs text-white/40">Failed</p>
          <p className="text-xl font-bold text-red-400">{stats.failedCount}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
          <p className="text-xs text-white/40">Transfers</p>
          <p className="text-xl font-bold text-blue-400">{stats.totalTransfers}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-2.5 text-white/30" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or ID..."
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer"
        >
          <option value="all">📊 All Types</option>
          <option value="deposit">💰 Deposits</option>
          <option value="withdrawal">🏦 Withdrawals</option>
          <option value="transfer">🔄 Transfers</option>
          <option value="payment">💳 Payments</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer"
        >
          <option value="all">📌 All Status</option>
          <option value="pending">⏳ Pending</option>
          <option value="completed">✅ Completed</option>
          <option value="failed">❌ Failed</option>
          <option value="cancelled">🚫 Cancelled</option>
        </select>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer"
        >
          <option value="all">📅 All Time</option>
          <option value="today">📆 Today</option>
          <option value="week">📊 This Week</option>
          <option value="month">📈 This Month</option>
          <option value="year">📉 This Year</option>
        </select>

        <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-white/40 transition flex items-center gap-2 border border-white/5">
          <Download size={16} />
          Export
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-white/30">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(tx.type)}
                        <span className="text-sm capitalize">{tx.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-white">{tx.user_name || 'Unknown'}</p>
                        <p className="text-xs text-white/30">{tx.user_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${
                        tx.type === 'deposit' ? 'text-green-400' :
                        tx.type === 'withdrawal' ? 'text-red-400' :
                        'text-blue-400'
                      }`}>
                        {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${getStatusBadge(tx.status)}`}>
                        {tx.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/40">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <button className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition">
                        <Eye size={14} className="text-white/40 hover:text-white" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}