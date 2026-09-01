'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { 
  RefreshCw, Loader2, Activity, DollarSign, 
  Shield, Settings, History, Eye, Gamepad2,
  Clock, Users, TrendingUp, Target, Zap
} from 'lucide-react';

export default function CrashGameAdmin() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalRounds: 0,
    totalBets: 0,
    totalStakes: 0,
    totalPayouts: 0,
    houseProfit: 0,
    averageCrash: 0,
    highestCrash: 0,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: allRounds } = await supabase
        .from('game_rounds')
        .select('*');

      if (allRounds && allRounds.length > 0) {
        const totalStakes = allRounds.reduce((acc, g) => acc + (g.total_stakes || 0), 0);
        const totalPayouts = allRounds.reduce((acc, g) => acc + (g.total_payouts || 0), 0);
        const houseProfit = allRounds.reduce((acc, g) => acc + (g.house_profit || 0), 0);
        
        const crashedRounds = allRounds.filter(r => r.crash_point !== null);
        const avgCrash = crashedRounds.length > 0 
          ? crashedRounds.reduce((acc, r) => acc + (r.crash_point || 0), 0) / crashedRounds.length 
          : 0;
        const highestCrash = crashedRounds.length > 0 
          ? Math.max(...crashedRounds.map(r => r.crash_point || 0)) 
          : 0;

        setStats({
          totalRounds: allRounds.length,
          totalBets: allRounds.reduce((acc, g) => acc + (g.total_bets || 0), 0),
          totalStakes,
          totalPayouts,
          houseProfit,
          averageCrash: avgCrash,
          highestCrash: highestCrash,
        });
      }

    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-orange-500">💥 Crash Game</h1>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-sm text-white/40">Rounds</p>
          <p className="text-2xl font-bold">{loading ? '...' : stats.totalRounds}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-white/40">Bets</p>
          <p className="text-2xl font-bold">{loading ? '...' : stats.totalBets}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-white/40">Avg Crash</p>
          <p className="text-2xl font-bold text-yellow-400">{loading ? '...' : stats.averageCrash.toFixed(2)}x</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-white/40">House Profit</p>
          <p className={`text-2xl font-bold ${stats.houseProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {loading ? '...' : `$${stats.houseProfit.toFixed(2)}`}
          </p>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-sm font-bold text-white/40 mb-4">Navigation</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/crash-game/bets">
            <div className="p-4 bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer text-center">
              <Eye className="mx-auto mb-2 text-blue-400" size={24} />
              <p className="font-bold">Bets</p>
              <p className="text-xs text-white/40">View all bets</p>
            </div>
          </Link>
          <Link href="/crash-game/fairness">
            <div className="p-4 bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer text-center">
              <Shield className="mx-auto mb-2 text-purple-400" size={24} />
              <p className="font-bold">Fairness</p>
              <p className="text-xs text-white/40">Verify fairness</p>
            </div>
          </Link>
          <Link href="/crash-game/settings">
            <div className="p-4 bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer text-center">
              <Settings className="mx-auto mb-2 text-yellow-400" size={24} />
              <p className="font-bold">Settings</p>
              <p className="text-xs text-white/40">Configure game</p>
            </div>
          </Link>
          <Link href="/crash-game/audit">
            <div className="p-4 bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer text-center">
              <History className="mx-auto mb-2 text-orange-400" size={24} />
              <p className="font-bold">Audit Log</p>
              <p className="text-xs text-white/40">View audit trail</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}