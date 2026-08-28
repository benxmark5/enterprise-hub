"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/supabase';
import { ArrowLeft, CheckCircle, XCircle, Clock, RefreshCw, DollarSign } from 'lucide-react';

type Request = {
  id: string; user_id: string; amount: number;
  currency: string; payout_method: string;
  payout_name: string; payout_identifier: string;
  status: string; admin_note: string;
  reference: string; created_at: string;
};

export default function WithdrawalsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selected, setSelected] = useState<Request | null>(null);
  const [note, setNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const query = supabase
      .from('withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter !== 'all') query.eq('status', filter);

    const { data } = await query;
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-withdrawals')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'withdrawal_requests'
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const approve = async (req: Request) => {
    setActionLoading(true);
    const { error } = await supabase
      .from('withdrawal_requests')
      .update({ status: 'approved', admin_note: note, reviewed_at: new Date().toISOString() })
      .eq('id', req.id);

    if (!error) {
      // Update wallet: deduct from pending, add to total_withdrawn
      const { data: wr } = await supabase
        .from('wallets').select('*').eq('user_id', req.user_id).single();
      if (wr) {
        await supabase.from('wallets').update({
          pending_balance: Math.max(0, (wr.pending_balance || 0) - req.amount),
          total_withdrawn: (wr.total_withdrawn || 0) + req.amount,
          updated_at: new Date().toISOString(),
        }).eq('user_id', req.user_id);
      }

      // Update transaction
      await supabase.from('wallet_transactions')
        .update({ status: 'completed' })
        .eq('reference', req.reference);

      // Notify user
      await supabase.from('notifications').insert({
        user_id: req.user_id,
        type: 'withdrawal_approved',
        title: '✅ Withdrawal Approved',
        message: `Your $${req.amount} withdrawal has been approved and is being processed.`,
        metadata: { reference: req.reference, amount: req.amount }
      });

      setSelected(null);
      setNote('');
      load();
    }
    setActionLoading(false);
  };

  const reject = async (req: Request) => {
    if (!note.trim()) { alert('Please add a reason for rejection'); return; }
    setActionLoading(true);
    const { error } = await supabase
      .from('withdrawal_requests')
      .update({ status: 'rejected', admin_note: note, reviewed_at: new Date().toISOString() })
      .eq('id', req.id);

    if (!error) {
      // Refund: move from pending back to available
      const { data: wr } = await supabase
        .from('wallets').select('*').eq('user_id', req.user_id).single();
      if (wr) {
        await supabase.from('wallets').update({
          available_balance: (wr.available_balance || 0) + req.amount,
          pending_balance: Math.max(0, (wr.pending_balance || 0) - req.amount),
          updated_at: new Date().toISOString(),
        }).eq('user_id', req.user_id);
      }

      await supabase.from('wallet_transactions')
        .update({ status: 'rejected' })
        .eq('reference', req.reference);

      await supabase.from('notifications').insert({
        user_id: req.user_id,
        type: 'withdrawal_rejected',
        title: '❌ Withdrawal Rejected',
        message: `Your $${req.amount} withdrawal was rejected. Reason: ${note}. Funds returned to your wallet.`,
        metadata: { reference: req.reference, amount: req.amount, reason: note }
      });

      setSelected(null);
      setNote('');
      load();
    }
    setActionLoading(false);
  };

  const methodIcon = (m: string) =>
    m === 'mpesa' ? '📱' : m === 'paypal' ? '💙' : m === 'usdt' ? '💎' : m === 'binance_pay' ? '₿' : '🏦';

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-4">
      <div className="max-w-6xl mx-auto">

        {/* Detail panel */}
        {selected && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ background: '#0a1628', border: '1px solid #1a2740', borderRadius: '20px', padding: '24px', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ fontWeight: 900, fontSize: '18px' }}>Withdrawal Request</h3>
                <button type="button" onClick={() => { setSelected(null); setNote(''); }} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '20px' }}>×</button>
              </div>

              {[
                { l: 'Reference', v: selected.reference },
                { l: 'Amount', v: `$${selected.amount.toFixed(2)} USD` },
                { l: 'Method', v: `${methodIcon(selected.payout_method)} ${selected.payout_method.replace('_', ' ')}` },
                { l: 'To', v: selected.payout_name },
                { l: 'Account', v: selected.payout_identifier },
                { l: 'Status', v: selected.status.toUpperCase() },
                { l: 'Submitted', v: new Date(selected.created_at).toLocaleString() },
              ].map(item => (
                <div key={item.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a2740' }}>
                  <span style={{ color: '#6b7280', fontSize: '13px' }}>{item.l}</span>
                  <span style={{ color: 'white', fontSize: '13px', fontWeight: 600, fontFamily: item.l === 'Reference' || item.l === 'Amount' ? 'monospace' : 'inherit' }}>{item.v}</span>
                </div>
              ))}

              {selected.status === 'pending' && (
                <>
                  <div style={{ marginTop: '16px', marginBottom: '14px' }}>
                    <label style={{ display: 'block', color: '#9ca3af', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '7px' }}>Admin Note (required for rejection)</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)}
                      rows={3} placeholder="Add note or reason..."
                      style={{ width: '100%', background: '#060f1e', border: '1px solid #1a2740', borderRadius: '10px', padding: '12px', color: 'white', fontSize: '13px', outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button type="button" onClick={() => reject(selected)} disabled={actionLoading}
                      style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '10px', padding: '12px', fontWeight: 900, cursor: 'pointer', fontSize: '14px', touchAction: 'manipulation' }}>
                      {actionLoading ? '...' : '❌ Reject'}
                    </button>
                    <button type="button" onClick={() => approve(selected)} disabled={actionLoading}
                      style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: '10px', padding: '12px', fontWeight: 900, cursor: 'pointer', fontSize: '14px', touchAction: 'manipulation' }}>
                      {actionLoading ? '...' : '✅ Approve'}
                    </button>
                  </div>
                </>
              )}

              {selected.admin_note && (
                <div style={{ marginTop: '14px', background: '#060f1e', border: '1px solid #1a2740', borderRadius: '10px', padding: '12px' }}>
                  <p style={{ color: '#6b7280', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>ADMIN NOTE</p>
                  <p style={{ color: '#9ca3af', fontSize: '13px' }}>{selected.admin_note}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link href="/" className="flex items-center text-zinc-500 hover:text-white mb-2 text-xs font-bold uppercase tracking-widest">
              <ArrowLeft size={14} className="mr-2" /> Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <DollarSign className="text-green-400" size={24} />
              <h1 className="text-2xl font-black italic tracking-tight text-green-400 uppercase">
                WITHDRAWAL CENTER
              </h1>
            </div>
          </div>
          <button type="button" onClick={load} className="flex items-center gap-2 text-zinc-500 hover:text-white border border-zinc-800 px-4 py-2 rounded-xl text-xs font-bold">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-1 mb-6 w-fit">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === f ? 'bg-green-500 text-black' : 'text-zinc-500 hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Pending', val: requests.filter(r => r.status === 'pending').length, color: '#fbbf24' },
            { label: 'Approved', val: requests.filter(r => r.status === 'approved').length, color: '#22c55e' },
            { label: 'Total $', val: `$${requests.filter(r => r.status === 'approved').reduce((s, r) => s + r.amount, 0).toFixed(0)}`, color: '#60a5fa' },
          ].map(s => (
            <div key={s.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center">
              <p className="font-black text-2xl font-mono" style={{ color: s.color }}>{s.val}</p>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-6 gap-3 px-4 py-3 border-b border-zinc-800">
            {['Reference', 'Amount', 'Method', 'Account', 'Status', 'Actions'].map(h => (
              <p key={h} className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{h}</p>
            ))}
          </div>
          <div className="divide-y divide-zinc-800/50">
            {loading ? (
              <div className="p-8 text-center text-zinc-500 animate-pulse text-xs">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 text-xs">No {filter} requests</div>
            ) : requests.map(r => (
              <div key={r.id} className="grid grid-cols-6 gap-3 px-4 py-3 hover:bg-zinc-800/30 items-center">
                <p className="text-xs font-mono text-zinc-400">{r.reference}</p>
                <p className="text-xs font-bold font-mono text-green-400">${r.amount.toFixed(2)}</p>
                <p className="text-xs">{methodIcon(r.payout_method)} {r.payout_method.replace('_', ' ')}</p>
                <div>
                  <p className="text-xs text-white truncate">{r.payout_name}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{r.payout_identifier}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full w-fit ${r.status === 'approved' ? 'bg-green-500/20 text-green-400' : r.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {r.status}
                </span>
                <button type="button" onClick={() => { setSelected(r); setNote(r.admin_note || ''); }}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer">
                  {r.status === 'pending' ? '⚡ Review' : '👁 View'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}