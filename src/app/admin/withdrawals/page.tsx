'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/currency/config';
import { formatDateTime } from '@/lib/utils';

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWithdrawals = async () => {
      const { data } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setWithdrawals(data || []);
      setLoading(false);
    };
    loadWithdrawals();
  }, []);

  if (loading) {
    return <div className="text-white/40">Loading withdrawals...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Withdrawals</h1>
      <div className="glass-card p-4">
        {withdrawals.length === 0 ? (
          <p className="text-white/40">No withdrawal requests found</p>
        ) : (
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <div key={w.id} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition flex justify-between items-center">
                <div>
                  <p className="font-semibold text-white">{formatCurrency(w.amount)}</p>
                  <p className="text-sm text-white/40">{w.status}</p>
                </div>
                <span className="text-xs text-white/30">{formatDateTime(w.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}