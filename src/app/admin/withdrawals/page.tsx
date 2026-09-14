'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/currency/config';
import { formatDateTime } from '@/lib/utils';
import {
  Loader2, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle,
  Banknote, Mail, User, ExternalLink, ShieldAlert, Zap
} from 'lucide-react';

type Pending = {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  amount_usd: number;
  currency: string;
  payout_method: string;
  payout_name: string;
  payout_identifier: string;
  reference: string;
  status: string;
  created_at: string;
  expires_at: string;
  seconds_remaining: number;
  is_expired: boolean;
};

type HistoryRow = {
  id: string;
  user_id: string;
  user_email: string | null;
  amount_usd: number;
  payout_method: string;
  payout_name: string;
  payout_identifier: string;
  reference: string;
  status: string;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string | null;
  audit_entries: number;
};

export default function WithdrawalsPage() {
  const [pending, setPending] = useState<Pending[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [, forceTick] = useState(0);

  // Get current admin email — adjust to however your admin app stores it
  const getAdminEmail = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_email') || 'admin@globalhub.com';
    }
    return 'admin@globalhub.com';
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pendingRes, historyRes] = await Promise.all([
        supabase.from('admin_pending_withdrawals').select('*'),
        supabase
          .from('admin_withdrawal_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      if (pendingRes.error) throw pendingRes.error;
      if (historyRes.error) throw historyRes.error;

      setPending((pendingRes.data ?? []) as Pending[]);
      setHistory((historyRes.data ?? []) as HistoryRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh every 15 seconds
    const id = setInterval(load, 15000);
    // Local tick for the countdown display
    const tick = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => {
      clearInterval(id);
      clearInterval(tick);
    };
  }, [load]);

  const approve = async (id: string) => {
    if (!confirm('Approve this withdrawal? You can still reject it before marking as paid.')) return;
    setBusyId(id);
    setError('');
    setSuccess('');
    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_approve_withdrawal', {
        p_withdrawal_id: id,
        p_actor_email: getAdminEmail(),
        p_actor_id: null,
        p_note: 'Approved for payout',
      });
      if (rpcErr) throw rpcErr;
      const r = data as { ok?: boolean; error?: string } | null;
      if (!r?.ok) throw new Error(r?.error || 'Approval failed');
      setSuccess('Withdrawal approved. Send the money via Paystack, then click "Mark Paid".');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approval failed');
    } finally {
      setBusyId(null);
    }
  };

  const complete = async (id: string) => {
    const note = prompt('Payout reference (e.g. M-Pesa TXN code):', 'Sent via Paystack');
    if (note === null) return;
    setBusyId(id);
    setError('');
    setSuccess('');
    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_complete_withdrawal', {
        p_withdrawal_id: id,
        p_actor_email: getAdminEmail(),
        p_actor_id: null,
        p_note: note || 'Paid',
      });
      if (rpcErr) throw rpcErr;
      const r = data as { ok?: boolean; error?: string } | null;
      if (!r?.ok) throw new Error(r?.error || 'Complete failed');
      setSuccess('Withdrawal marked as paid. User notified.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Complete failed');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    const reason = prompt('Reason for rejection (shown to user):');
    if (reason === null) return;
    if (!reason.trim()) {
      setError('Rejection reason is required');
      return;
    }
    setBusyId(id);
    setError('');
    setSuccess('');
    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_reject_withdrawal', {
        p_withdrawal_id: id,
        p_actor_email: getAdminEmail(),
        p_reason: reason.trim(),
        p_actor_id: null,
      });
      if (rpcErr) throw rpcErr;
      const r = data as { ok?: boolean; error?: string } | null;
      if (!r?.ok) throw new Error(r?.error || 'Rejection failed');
      setSuccess('Withdrawal rejected. Funds refunded to user wallet.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rejection failed');
    } finally {
      setBusyId(null);
    }
  };

  const fmtCountdown = (sec: number) => {
    if (sec <= 0) return 'EXPIRED';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending':  return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'approved': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'paid':     return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'rejected': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'expired':  return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
      default:         return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Banknote size={22} className="text-emerald-400" /> Withdrawals
          </h1>
          <p className="text-sm text-white/40">
            Pending queue processes automatically. Admin SLA: 5 minutes. Auto-expire: 1 hour.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300 flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">×</button>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <CheckCircle size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-300 flex-1">{success}</p>
          <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-300">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 text-sm font-bold transition border-b-2 -mb-[1px] ${
            tab === 'pending'
              ? 'text-amber-400 border-amber-400'
              : 'text-white/40 border-transparent hover:text-white/60'
          }`}
        >
          Pending Queue {pending.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-amber-500/20 rounded-md text-xs">{pending.length}</span>}
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2 text-sm font-bold transition border-b-2 -mb-[1px] ${
            tab === 'history'
              ? 'text-emerald-400 border-emerald-400'
              : 'text-white/40 border-transparent hover:text-white/60'
          }`}
        >
          History
        </button>
      </div>

      {loading && pending.length === 0 && history.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <span className="ml-3 text-white/40">Loading...</span>
        </div>
      ) : tab === 'pending' ? (
        <PendingList
          items={pending}
          busyId={busyId}
          fmtCountdown={fmtCountdown}
          statusColor={statusColor}
          onApprove={approve}
          onComplete={complete}
          onReject={reject}
        />
      ) : (
        <HistoryList items={history} statusColor={statusColor} />
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Pending queue
// ------------------------------------------------------------
function PendingList({
  items, busyId, fmtCountdown, statusColor, onApprove, onComplete, onReject,
}: {
  items: Pending[];
  busyId: string | null;
  fmtCountdown: (s: number) => string;
  statusColor: (s: string) => string;
  onApprove: (id: string) => void;
  onComplete: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <CheckCircle size={40} className="text-emerald-400/40 mx-auto mb-3" />
        <p className="text-white/50 font-semibold">Queue is empty</p>
        <p className="text-white/30 text-sm mt-1">No pending withdrawals right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((w) => {
        const expired = w.seconds_remaining <= 0 || w.is_expired;
        const busy = busyId === w.id;
        const canApprove = !expired && w.status === 'pending';
        const canComplete = !expired && (w.status === 'pending' || w.status === 'approved');
        return (
          <div
            key={w.id}
            className={`glass-card p-4 border ${
              expired ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/20 bg-amber-500/5'
            }`}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              {/* Left: amount + user */}
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-2xl font-black text-white">
                    {formatCurrency(w.amount_usd)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusColor(w.status)}`}>
                    {w.status}
                  </span>
                  {expired && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                      ⚠ Expired
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-col gap-1 text-sm">
                  <div className="flex items-center gap-2 text-white/60">
                    <User size={12} /> <span>{w.user_name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40 text-xs">
                    <Mail size={12} /> <span>{w.user_email || '—'}</span>
                  </div>
                  <div className="text-xs text-white/40 font-mono mt-1">
                    Ref: {w.reference}
                  </div>
                </div>
              </div>

              {/* Middle: payout details */}
              <div className="min-w-[200px]">
                <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-1">Payout</p>
                <p className="text-sm text-white/80 font-semibold">{w.payout_method}</p>
                <p className="text-sm text-white/60">{w.payout_name}</p>
                <p className="text-xs text-white/40 font-mono">{w.payout_identifier}</p>
              </div>

              {/* Right: countdown + actions */}
              <div className="flex flex-col items-end gap-3">
                <div className="text-right">
                  <p className="text-xs text-white/40 uppercase font-bold tracking-wider">Expires in</p>
                  <p className={`text-lg font-black tabular-nums ${
                    expired ? 'text-red-400' : w.seconds_remaining < 600 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {fmtCountdown(w.seconds_remaining)}
                  </p>
                  <p className="text-[10px] text-white/30">
                    Created {formatDateTime(w.created_at)}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
                  <button
                    onClick={() => onApprove(w.id)}
                    disabled={busy || !canApprove}
                    className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-xs font-bold border border-blue-500/30 transition disabled:opacity-40 flex items-center gap-1"
                  >
                    {busy ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                    Approve
                  </button>
                  <button
                    onClick={() => onComplete(w.id)}
                    disabled={busy || !canComplete}
                    className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-xs font-bold border border-emerald-500/30 transition disabled:opacity-40 flex items-center gap-1"
                  >
                    <CheckCircle size={12} /> Mark Paid
                  </button>
                  <button
                    onClick={() => onReject(w.id)}
                    disabled={busy || expired}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-bold border border-red-500/30 transition disabled:opacity-40 flex items-center gap-1"
                  >
                    <XCircle size={12} /> Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------
// History list
// ------------------------------------------------------------
function HistoryList({
  items, statusColor,
}: {
  items: HistoryRow[];
  statusColor: (s: string) => string;
}) {
  if (items.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-white/30">
        No withdrawal history yet
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Payout</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Reviewed By</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-white/40 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.map((w) => (
              <tr key={w.id} className="hover:bg-white/5 transition">
                <td className="px-4 py-3 font-bold text-white">
                  {formatCurrency(w.amount_usd)}
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-white/70">{w.user_email || '—'}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-white/70">{w.payout_method}</p>
                  <p className="text-xs text-white/40 font-mono">{w.payout_identifier}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${statusColor(w.status)}`}>
                    {w.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-white/40">
                  {w.reviewed_by || '—'}
                </td>
                <td className="px-4 py-3 text-xs text-white/40">
                  {formatDateTime(w.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}