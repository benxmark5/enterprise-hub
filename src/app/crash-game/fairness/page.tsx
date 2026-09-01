'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { RefreshCw, Loader2, ArrowLeft, Shield, CheckCircle, XCircle, Copy } from 'lucide-react';

export default function CrashGameFairness() {
  const [loading, setLoading] = useState(true);
  const [fairnessData, setFairnessData] = useState<any[]>([]);

  const loadFairness = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('game_fairness')
        .select('*, game_rounds(round_number, crash_point)')
        .order('created_at', { ascending: false })
        .limit(50);

      setFairnessData(data || []);
    } catch (error) {
      console.error('Error loading fairness data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFairness();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/crash-game">
          <button className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition">
            <ArrowLeft size={20} />
          </button>
        </Link>
        <h1 className="text-2xl font-bold text-purple-400">🔐 Fairness</h1>
        <button
          onClick={loadFairness}
          disabled={loading}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="text-purple-400" size={24} />
          <h2 className="text-lg font-bold">How Fairness Works</h2>
        </div>
        <p className="text-white/60 text-sm">
          Each round uses a cryptographically secure combination of server seed, client seed, and nonce 
          to generate the crash point. The hash is committed before the round starts, ensuring 
          provable fairness.
        </p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40">Round</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40">Crash Point</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40">Hash</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-white/40">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-white/40">
                    <Loader2 className="animate-spin inline mr-2" size={16} />
                    Loading...
                  </td>
                </tr>
              ) : fairnessData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-white/40">
                    No fairness records found
                  </td>
                </tr>
              ) : (
                fairnessData.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3 font-bold">
                      #{item.game_rounds?.round_number || 'N/A'}
                    </td>
                    <td className="px-4 py-3 font-bold text-yellow-400">
                      {item.crash_point || item.game_rounds?.crash_point || 'N/A'}x
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-purple-400 truncate max-w-[150px]">
                          {item.hash?.slice(0, 20) || 'N/A'}...
                        </code>
                        {item.hash && (
                          <button
                            onClick={() => copyToClipboard(item.hash)}
                            className="p-1 hover:bg-white/10 rounded transition"
                          >
                            <Copy size={14} className="text-white/40" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.verified ? (
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle size={16} /> Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-400">
                          <XCircle size={16} /> Pending
                        </span>
                      )}
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