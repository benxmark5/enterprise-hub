'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/currency/config';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { WithdrawalRequest } from '@/types';

export default function WithdrawalsPage() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const supabase = createClient();

  useEffect(() => {
    loadRequests();
  }, [activeTab]);

  const loadRequests = async () => {
    setLoading(true);
    const { data } = await supabase.from('withdrawal_requests').select('*, profiles(email, full_name)').eq('status', activeTab).order('created_at', { ascending: false });
    setRequests(data as WithdrawalRequest[] || []);
    setLoading(false);
  };

  const handleAction = async (id: string, action: 'approved' | 'rejected', reason?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('withdrawal_requests').update({
      status: action,
      processed_at: new Date().toISOString(),
      processed_by: session?.user.id,
      admin_notes: reason || null
    }).eq('id', id);
    loadRequests();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gh-text-primary">Withdrawal Center</h1>
      <div className="flex gap-2 mb-4">
        {(['pending', 'approved', 'rejected'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all",
              activeTab === tab ? "bg-gh-accent text-white" : "text-gh-text-secondary hover:bg-gh-bg-elevated")}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      {loading ? <p className="text-gh-text-muted">Loading...</p> : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="gh-card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gh-text-primary">{formatCurrency(req.amount, req.currency)}</p>
                <p className="text-xs text-gh-text-muted">{req.payout_method} • {formatDateTime(req.created_at)}</p>
              </div>
              {activeTab === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleAction(req.id, 'approved')} className="gh-btn-primary text-xs py-2 px-3">Approve</button>
                  <button onClick={() => handleAction(req.id, 'rejected', 'Insufficient verification')} className="gh-btn-secondary text-xs py-2 px-3">Reject</button>
                </div>
              )}
            </div>
          ))}
          {requests.length === 0 && <p className="text-gh-text-muted text-center py-8">No {activeTab} withdrawals.</p>}
        </div>
      )}
    </div>
  );
}
