'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { 
  Search, RefreshCw, Loader2, 
  Users, Eye, Mail, Calendar, Wallet,
  TrendingUp, TrendingDown, UserPlus,
  AlertCircle
} from 'lucide-react';

type Customer = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  wallet_balance: number;
  total_deposits: number;
  total_withdrawals: number;
  total_spent: number;
  purchases_count: number;
};

export default function CustomersPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    newThisWeek: 0,
  });

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Profiles error:', profilesError);
        setError('Failed to load profiles: ' + profilesError.message);
        setLoading(false);
        return;
      }

      if (!profiles || profiles.length === 0) {
        setCustomers([]);
        setStats({ total: 0, active: 0, newThisWeek: 0 });
        setLoading(false);
        return;
      }

      // Get wallet data for each profile
      const customersWithData = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Get wallet balance - try/catch to handle missing table
          let walletBalance = 0;
          try {
            const { data: wallet } = await supabase
              .from('wallets')
              .select('available_balance')
              .eq('user_id', profile.id)
              .single();
            walletBalance = wallet?.available_balance || 0;
          } catch (e) {
            console.warn('Wallet not found for user:', profile.id);
          }

          // Get deposits - try/catch to handle missing table
          let totalDeposits = 0;
          try {
            const { data: deposits } = await supabase
              .from('wallet_transactions')
              .select('amount')
              .eq('user_id', profile.id)
              .eq('type', 'deposit')
              .eq('status', 'completed');
            totalDeposits = deposits?.reduce((sum, t) => sum + t.amount, 0) || 0;
          } catch (e) {
            console.warn('Wallet transactions not found for user:', profile.id);
          }

          // Get withdrawals
          let totalWithdrawals = 0;
          try {
            const { data: withdrawals } = await supabase
              .from('wallet_transactions')
              .select('amount')
              .eq('user_id', profile.id)
              .eq('type', 'withdrawal')
              .eq('status', 'completed');
            totalWithdrawals = withdrawals?.reduce((sum, t) => sum + t.amount, 0) || 0;
          } catch (e) {
            console.warn('Withdrawals not found for user:', profile.id);
          }

          // Get purchases count
          let purchasesCount = 0;
          try {
            const { count } = await supabase
              .from('purchases')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.id);
            purchasesCount = count || 0;
          } catch (e) {
            console.warn('Purchases not found for user:', profile.id);
          }

          const totalSpent = Math.max(totalDeposits - totalWithdrawals - walletBalance, 0);

          return {
            ...profile,
            wallet_balance: walletBalance,
            total_deposits: totalDeposits,
            total_withdrawals: totalWithdrawals,
            total_spent: totalSpent,
            purchases_count: purchasesCount,
          };
        })
      );

      setCustomers(customersWithData);
      setStats({
        total: customersWithData.length,
        active: customersWithData.filter(c => c.role === 'user' || c.role === 'admin').length,
        newThisWeek: customersWithData.filter(c => {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return new Date(c.created_at) > weekAgo;
        }).length,
      });

    } catch (err: any) {
      console.error('Error loading customers:', err);
      setError(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    loadCustomers();
  }, []);

  if (loading) {
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
            onClick={loadCustomers}
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">👥 Customers</h1>
          <p className="text-sm text-white/40">Manage all platform customers</p>
        </div>
        <button
          onClick={loadCustomers}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <p className="text-xs text-white/40 uppercase tracking-wider">Total Customers</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <p className="text-xs text-white/40 uppercase tracking-wider">Active Users</p>
          <p className="text-2xl font-bold text-green-400">{stats.active}</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <p className="text-xs text-white/40 uppercase tracking-wider">New This Week</p>
          <p className="text-2xl font-bold text-blue-400">{stats.newThisWeek}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 text-white/30" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </div>
      </div>

      <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase tracking-wider">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase tracking-wider">Deposits</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase tracking-wider">Purchases</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-white/30">
                    No customers found
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                          {customer.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="font-bold text-sm">{customer.full_name || 'Unnamed'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/60">{customer.email}</td>
                    <td className="px-4 py-3 text-sm font-bold text-green-400">
                      ${customer.wallet_balance.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-blue-400">
                      ${customer.total_deposits.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-yellow-400">
                      {customer.purchases_count}
                    </td>
                    <td className="px-4 py-3 text-sm text-white/40">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/customers/${customer.id}`}>
                        <button className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition">
                          <Eye size={14} className="text-white/40 hover:text-white" />
                        </button>
                      </Link>
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