"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/app/supabase';
import Link from 'next/link';
import {
  ArrowLeft, Users, Search,
  Mail, Calendar, ShoppingBag,
  DollarSign, RefreshCw, TrendingUp
} from 'lucide-react';

type Customer = {
  id: string;
  email: string;
  created_at: string;
  full_name?: string;
  purchases: number;
  totalSpent: number;
  lastPurchase?: string;
  signalTypes: string[];
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [customerPurchases, setCustomerPurchases] = useState<{
    id: string; plan: string; amount: number;
    currency: string; signal_type: string;
    status: string; created_at: string;
  }[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data: authData } =
        await supabase.auth.admin.listUsers();
      const users = authData?.users || [];

      const { data: purchases } = await supabase
        .from('purchases')
        .select('*')
        .eq('status', 'completed');

      const allPurchases = purchases || [];

      const customerList: Customer[] = users.map(user => {
        const userPurchases = allPurchases.filter(
          p => p.user_id === user.id
        );
        const types = [
          ...new Set(
            userPurchases.map(p => p.signal_type)
          )
        ] as string[];
        const lastP = userPurchases[0];

        return {
          id: user.id,
          email: user.email || '',
          created_at: user.created_at || '',
          full_name: user.user_metadata?.full_name,
          purchases: userPurchases.length,
          totalSpent: userPurchases.reduce(
            (s, p) => s + (p.amount || 0), 0
          ),
          lastPurchase: lastP?.created_at,
          signalTypes: types,
        };
      });

      // Sort by most purchases
      customerList.sort((a, b) => b.purchases - a.purchases);

      setCustomers(customerList);
      setFiltered(customerList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!search) {
      setFiltered(customers);
      return;
    }
    setFiltered(customers.filter(c =>
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.full_name?.toLowerCase().includes(
        search.toLowerCase()
      )
    ));
  }, [search, customers]);

  const loadCustomerPurchases = async (customerId: string) => {
    const { data } = await supabase
      .from('purchases')
      .select('*')
      .eq('user_id', customerId)
      .order('created_at', { ascending: false });
    setCustomerPurchases(data || []);
  };

  const totalRevenue = customers.reduce(
    (s, c) => s + c.totalSpent, 0
  );
  const activeCustomers = customers.filter(
    c => c.purchases > 0
  ).length;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/"
              className="flex items-center text-zinc-500 hover:text-white mb-2 text-xs font-bold uppercase tracking-widest">
              <ArrowLeft size={14} className="mr-2" />
              Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <Users className="text-blue-400" size={28} />
              <h1 className="text-3xl font-black italic tracking-tight text-blue-400 uppercase">
                CUSTOMERS
              </h1>
            </div>
          </div>
          <button type="button" onClick={load}
            className="flex items-center gap-2 text-zinc-500 hover:text-white border border-zinc-800 px-4 py-2 rounded-xl text-xs font-bold">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'Total Users',
              value: customers.length,
              color: '#60a5fa', icon: Users
            },
            {
              label: 'Paying Customers',
              value: activeCustomers,
              color: '#22c55e', icon: DollarSign
            },
            {
              label: 'Total Revenue',
              value: `KES ${totalRevenue.toLocaleString()}`,
              color: '#fbbf24', icon: ShoppingBag
            },
            {
              label: 'Avg per Customer',
              value: activeCustomers > 0
                ? `KES ${Math.floor(
                    totalRevenue / activeCustomers
                  ).toLocaleString()}`
                : 'KES 0',
              color: '#a78bfa', icon: TrendingUp
            },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label}
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                <Icon size={16} className="mb-3"
                  style={{ color: s.color }} />
                <p className="font-black text-xl font-mono"
                  style={{ color: s.color }}>
                  {loading ? '...' : s.value}
                </p>
                <p className="text-zinc-500 text-xs uppercase tracking-wider mt-1">
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Customer List */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 flex-1">
                <Search size={14} className="text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by email or name..."
                  className="bg-transparent text-white text-sm outline-none w-full placeholder:text-zinc-600"
                />
              </div>
              <p className="text-xs text-zinc-500 whitespace-nowrap">
                {filtered.length} users
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="grid grid-cols-5 gap-3 px-4 py-3 border-b border-zinc-800">
                {[
                  'Customer', 'Joined', 'Purchases',
                  'Spent', 'Types'
                ].map(h => (
                  <p key={h} className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {h}
                  </p>
                ))}
              </div>

              <div className="divide-y divide-zinc-800/50 max-h-[60vh] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-zinc-500 animate-pulse text-xs">
                    Loading customers...
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-8 text-center text-zinc-600 text-xs">
                    No customers found
                  </div>
                ) : filtered.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelected(c);
                      loadCustomerPurchases(c.id);
                    }}
                    className={`w-full grid grid-cols-5 gap-3 px-4 py-3 hover:bg-zinc-800/50 text-left transition-all ${
                      selected?.id === c.id
                        ? 'bg-blue-500/10 border-l-2 border-blue-500'
                        : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate text-white">
                        {c.full_name || 'User'}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {c.email}
                      </p>
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
                    <p className={`text-xs font-bold ${
                      c.purchases > 0 ? 'text-green-400' : 'text-zinc-600'
                    }`}>
                      {c.purchases}
                    </p>
                    <p className="text-xs font-bold font-mono text-yellow-400">
                      {c.totalSpent > 0
                        ? `KES ${c.totalSpent.toLocaleString()}`
                        : '-'
                      }
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      {c.signalTypes.map(t => (
                        <span key={t}
                          className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                          {t === 'football' ? '⚽' : '✈️'}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Customer Detail */}
          <div>
            {!selected ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 h-64 flex items-center justify-center">
                <div className="text-center">
                  <Users size={32} className="text-zinc-700 mx-auto mb-2" />
                  <p className="text-zinc-600 text-xs">
                    Select a customer to view details
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                {/* Customer Header */}
                <div className="p-5 border-b border-zinc-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center justify-center">
                      <Users size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">
                        {selected.full_name || 'User'}
                      </p>
                      <p className="text-zinc-500 text-xs">
                        {selected.email}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        label: 'Total Spent',
                        value: `KES ${selected.totalSpent.toLocaleString()}`,
                        color: '#22c55e'
                      },
                      {
                        label: 'Purchases',
                        value: selected.purchases,
                        color: '#60a5fa'
                      },
                    ].map(m => (
                      <div key={m.label} className="bg-zinc-950 rounded-xl p-3 text-center">
                        <p className="font-black text-lg font-mono" style={{ color: m.color }}>
                          {m.value}
                        </p>
                        <p className="text-zinc-600 text-[10px] uppercase tracking-wider">
                          {m.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Purchase History */}
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
                    Purchase History
                  </p>
                  {customerPurchases.length === 0 ? (
                    <p className="text-zinc-600 text-xs text-center py-4">
                      No purchases yet
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {customerPurchases.map(p => (
                        <div key={p.id} className="bg-zinc-950 rounded-xl px-3 py-2.5 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold">
                              {p.signal_type === 'football' ? '⚽' : '✈️'}{' '}
                              {p.plan || 'Signal'}
                            </p>
                            <p className="text-[10px] text-zinc-600">
                              {new Date(p.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold font-mono text-green-400">
                              {p.currency || 'KES'}{' '}
                              {(p.amount || 0).toLocaleString()}
                            </p>
                            <span className={`text-[9px] font-bold ${
                              p.status === 'completed' ? 'text-green-400' : 'text-yellow-400'
                            }`}>
                              {p.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Contact */}
                <div className="px-4 pb-4">
                  <a
                    href={`mailto:${selected.email}`}
                    className="w-full flex items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 py-3 rounded-xl text-xs font-bold uppercase transition-all"
                  >
                    <Mail size={14} />
                    Send Email
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}