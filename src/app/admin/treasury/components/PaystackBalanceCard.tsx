// src/app/admin/treasury/components/PaystackBalanceCard.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, CreditCard, AlertTriangle } from 'lucide-react';
import { formatMoney, relativeTime } from '@/lib/treasury/format';

type Balance = { currency: string; balance_minor: number; balance: number };

export default function PaystackBalanceCard() {
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/paystack-balance', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) {
        setBalances(data.balances || []);
        setFetchedAt(data.fetched_at || null);
        setUnavailable(null);
      } else {
        setUnavailable(data.reason || 'Unavailable');
        setBalances([]);
      }
    } catch (e) {
      setUnavailable(e instanceof Error ? e.message : 'Unknown');
      setBalances([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.06] to-cyan-500/[0.01] p-5 h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
            <CreditCard size={14} className="text-cyan-300" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Paystack Live Balance
            </p>
            <p className="text-[10px] text-white/40">
              {fetchedAt ? `Synced ${relativeTime(fetchedAt)}` : 'Fetching...'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin text-cyan-300' : 'text-white/50'} />
        </button>
      </div>

      {unavailable ? (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <AlertTriangle size={14} className="text-amber-300 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-300">Unavailable</p>
            <p className="text-[11px] text-amber-200/60 mt-0.5">{unavailable}</p>
          </div>
        </div>
      ) : balances.length === 0 && !loading ? (
        <p className="text-sm text-white/40">No balances reported</p>
      ) : (
        <div className="space-y-2">
          {balances.map(b => (
            <div key={b.currency} className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-white/40">{b.currency}</span>
              <span className="text-lg font-black tabular-nums text-white">
                {loading ? '...' : formatMoney(b.balance, b.currency)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="pointer-events-none absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />
    </div>
  );
}