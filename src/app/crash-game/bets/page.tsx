'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { RefreshCw, Loader2, ArrowLeft, Search } from 'lucide-react';

export default function CrashGameBets() {
  const [loading, setLoading] = useState(true);
  const [bets, setBets] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const loadBets = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('game_bets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      setBets(data || []);
    } catch (error) {
      console.error('Error loading bets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBets();
  }, []);

  const filteredBets = bets.filter(bet => 
    bet.anonymous_id?.toLowerCase().includes(search.toLowerCase()) ||
    bet.id.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
      cashed_out: 'text-green-400 bg-green-500/10 border-green-500/20',
      won: 'text-green-400 bg-green-500/10 border-green-500/20',
      lost: 'text-red-400 bg-red-500/10 border-red-500/20',
      cancelled: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
    };
    return colors[status] || 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/crash-game">
          <button className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition">
            <ArrowLeft size={20} />
          </button>
        </Link>
        <h1 className="text-2xl font-bold text-orange-500">💥 Bets</h1>
        <button
          onClick={loadBets}
          disabled={loading}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-white/40" size={16} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search bets..."
          className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500"
        />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40">Player</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40">Multiplier</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40">Payout</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                    <Loader2 className="animate-spin inline mr-2" size={16} />
                    Loading bets...
                  </td>
                </tr>
              ) : filteredBets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                    No bets found
                  </td>
                </tr>
              ) : (
                filteredBets.map((bet) => (
                  <tr key={bet.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3 font-mono text-sm text-white/60">
                      {bet.anonymous_id?.slice(-8) || 'N/A'}
                    </td>
                    <td className="px-4 py-3 font-bold text-green-400">
                      ${bet.bet_amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-bold text-yellow-400">
                      {bet.cashout_multiplier ? `${bet.cashout_multiplier}x` : '-'}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {bet.payout ? `$${bet.payout.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getStatusColor(bet.status)}`}>
                        {bet.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/30">
                      {new Date(bet.created_at).toLocaleString()}
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