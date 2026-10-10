// src/app/admin/marketers/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Copy, ExternalLink,
  CheckCircle, XCircle, AlertCircle,
  User as UserIcon, TrendingUp, MousePointerClick, DollarSign,
  Wallet, ShieldCheck, Ban, History as HistoryIcon,
} from 'lucide-react';
import { relativeTime } from '@/lib/providers/format';
import { getStatusTheme } from '@/lib/admin/status-theme';

type Marketer = {
  id: string;
  user_id: string | null;
  referral_code: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  profile_photo: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  payout_method: string | null;
  payout_identifier: string | null;
  payout_currency: string;
  pending_earnings: number;
  total_paid: number;
  total_conversions: number;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Stats = {
  totalSignups: number;
  totalPurchases: number;
  totalPurchaseVolume: number;
  totalCommissionEarned: number;
  totalPaid: number;
  pendingPayouts: number;
  totalClicks: number;
};

type HistoryRow = {
  id: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  actor_email: string | null;
  created_at: string;
};

type PayoutRow = {
  id: string;
  amount_usd: number;
  period_start: string | null;
  period_end: string | null;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  payout_method: string | null;
  payout_identifier: string | null;
  requested_at: string;
  paid_at: string | null;
  admin_note: string | null;
};

export default function MarketerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || '');

  const [marketer, setMarketer] = useState<Marketer | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/admin/marketers/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setMarketer(data.marketer as Marketer);
      setStats(data.stats as Stats);
      setHistory(data.history ?? []);
      setPayouts(data.payouts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (kind: 'approve' | 'reject' | 'suspend') => {
    if (!marketer) return;

    let body: Record<string, string> = {};
    if (kind === 'approve') {
      if (!confirm(`Approve ${marketer.display_name}?`)) return;
      body = { note: 'Approved after manual review' };
    } else if (kind === 'reject') {
      const reason = prompt('Reason for rejection (shown to applicant):');
      if (reason === null) return;
      if (!reason.trim()) { setError('Rejection reason required'); return; }
      body = { reason: reason.trim() };
    } else {
      const reason = prompt('Reason for suspension (optional):') ?? '';
      body = { reason: reason.trim() };
    }

    setBusy(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/admin/marketers/${id}/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `${kind} failed`);
      const past = kind === 'approve' ? 'approved' : kind === 'reject' ? 'rejected' : 'suspended';
      setSuccess(`Marketer ${past}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : `${kind} failed`);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (kind: 'code' | 'link') => {
    if (!marketer) return;
    const base = process.env.NEXT_PUBLIC_PUBLIC_APP_URL || 'https://globalhub.app';
    const value = kind === 'code' ? marketer.referral_code : `${base}/?ref=${marketer.referral_code}`;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* ignore */ }
  };

  if (loading && !marketer) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (error && !marketer) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <p className="text-rose-300 font-bold">{error}</p>
        <button
          onClick={() => router.push('/admin/marketers')}
          className="mt-4 px-4 py-2 bg-purple-500 text-black rounded-lg font-bold"
        >
          Back to Marketers
        </button>
      </div>
    );
  }

  if (!marketer || !stats) return null;

  const theme = getStatusTheme(marketer.status);
  const shareLink = `${process.env.NEXT_PUBLIC_PUBLIC_APP_URL || 'https://globalhub.app'}/?ref=${marketer.referral_code}`;

  return (
    <div className="relative max-w-[1200px] bg-[#0B0F19] rounded-3xl p-6 -m-6">
      {/* Ambient status halo */}
      <div
        className={`pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[1100px] h-[520px] bg-gradient-to-b ${theme.pageGlow} blur-3xl`}
        aria-hidden
      />

      <div className="relative space-y-6">
        {/* Futuristic status bar */}
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`absolute inline-flex h-full w-full rounded-full ${theme.dotColor} opacity-75 animate-ping`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${theme.dotColor}`} />
          </span>
          <div className={`flex-1 h-[3px] rounded-full ${theme.pageBar} ${theme.barGlow}`} />
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <Link
            href="/admin/marketers"
            className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/60 hover:border-purple-500/50 backdrop-blur-md transition-all duration-300 group"
          >
            <ArrowLeft size={18} className="text-slate-400 group-hover:text-slate-100 transition" />
          </Link>
          <div className="flex items-center gap-3 flex-1 min-w-[240px]">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-lg font-black flex-shrink-0 shadow-[0_0_24px_rgba(168,85,247,0.35)]">
              {(marketer.display_name || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent truncate">
                {marketer.display_name}
              </h1>
              <p className="text-sm text-slate-400 mt-0.5 truncate">
                {marketer.email || 'No email'} · Joined {relativeTime(marketer.created_at)}
              </p>
            </div>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest ${theme.badge}`}>
            {theme.label}
          </span>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl backdrop-blur-md">
            <AlertCircle size={18} className="text-rose-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-rose-300 flex-1">{error}</p>
            <button onClick={() => setError('')} className="text-rose-400">×</button>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl backdrop-blur-md">
            <CheckCircle size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-300 flex-1">{success}</p>
            <button onClick={() => setSuccess('')} className="text-emerald-400">×</button>
          </div>
        )}

        {/* Referral link bar */}
        <div className={`relative rounded-2xl p-5 flex items-center justify-between flex-wrap gap-3 overflow-hidden bg-slate-900/80 border border-slate-800/60 shadow-xl backdrop-blur-md ${theme.headerRing}`}>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden />
          <div className="relative flex items-center gap-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">Referral code</p>
              <button
                type="button"
                onClick={() => copy('code')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-purple-500/50 font-mono text-sm text-slate-100 transition-all"
              >
                {marketer.referral_code}
                <Copy size={12} className="text-slate-500" />
                {copied === 'code' && <span className="text-[10px] text-emerald-400">copied</span>}
              </button>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">Share link</p>
              <button
                type="button"
                onClick={() => copy('link')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-purple-500/50 text-xs text-slate-300 transition-all max-w-[320px] truncate"
              >
                <span className="truncate">{shareLink}</span>
                <Copy size={12} className="text-slate-500 flex-shrink-0" />
                {copied === 'link' && <span className="text-[10px] text-emerald-400">copied</span>}
              </button>
            </div>
          </div>
          <a
            href={shareLink}
            target="_blank"
            rel="noreferrer"
            className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/50 text-xs font-bold text-purple-300 transition-all"
          >
            <ExternalLink size={12} /> Test link
          </a>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={<MousePointerClick size={14} />}
            label="Clicks"
            value={stats.totalClicks.toLocaleString()}
            tint="text-purple-400"
          />
          <KpiCard
            icon={<UserIcon size={14} />}
            label="Signups"
            value={stats.totalSignups.toLocaleString()}
            tint="text-blue-400"
          />
          <KpiCard
            icon={<TrendingUp size={14} />}
            label="First purchases"
            value={stats.totalPurchases.toLocaleString()}
            tint="text-emerald-400"
          />
          <KpiCard
            icon={<DollarSign size={14} />}
            label="Purchase volume"
            value={`$${stats.totalPurchaseVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            tint="text-amber-400"
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left */}
          <div className="lg:col-span-2 space-y-5">
            <GlassSection icon={<UserIcon size={14} />} title="Marketer" theme={theme}>
              <Field label="Display name" value={marketer.display_name} />
              <Field label="Email" value={marketer.email || '—'} mono />
              <Field label="Phone" value={marketer.phone || '—'} mono />
              <Field label="Country" value={marketer.country || '—'} />
              <Field label="User ID" value={marketer.user_id || '— (not linked)'} mono />
              <Field label="Joined" value={relativeTime(marketer.created_at)} />
              <Field label="Last updated" value={relativeTime(marketer.updated_at)} />
              {marketer.notes && <Field label="Admin notes" value={marketer.notes} multiline />}
              {marketer.rejection_reason && (
                <Field label="Rejection reason" value={marketer.rejection_reason} multiline />
              )}
            </GlassSection>

            <GlassSection icon={<HistoryIcon size={14} />} title="Status history" theme={theme}>
              {history.length === 0 ? (
                <p className="text-sm text-slate-500 italic">
                  No status changes recorded yet. Approve, reject, or suspend this marketer to start the audit trail.
                </p>
              ) : (
                <div className="space-y-3">
                  {history.map(h => (
                    <div key={h.id} className="flex items-start gap-3 pb-3 border-b border-slate-800/60 last:border-0 last:pb-0">
                      <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        h.to_status === 'approved' ? 'bg-emerald-400' :
                        h.to_status === 'rejected' ? 'bg-rose-400' :
                        h.to_status === 'suspended' ? 'bg-slate-400' : 'bg-amber-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200">
                          <span className="text-slate-500">{h.from_status || 'new'}</span>
                          <span className="mx-2 text-slate-600">→</span>
                          <span className="font-bold">{h.to_status}</span>
                        </p>
                        {h.reason && <p className="text-xs text-slate-400 mt-0.5">{h.reason}</p>}
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {h.actor_email || 'system'} · {relativeTime(h.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassSection>

            <GlassSection icon={<Wallet size={14} />} title="Payout history" theme={theme}>
              {payouts.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No payouts recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">
                        <th className="text-left pb-2">Amount</th>
                        <th className="text-left pb-2">Status</th>
                        <th className="text-left pb-2">Requested</th>
                        <th className="text-left pb-2">Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {payouts.map(p => (
                        <tr key={p.id}>
                          <td className="py-2 text-slate-200 font-mono">
                            ${Number(p.amount_usd).toFixed(2)}
                          </td>
                          <td className="py-2 text-slate-300 capitalize">{p.status}</td>
                          <td className="py-2 text-slate-500 text-xs">{relativeTime(p.requested_at)}</td>
                          <td className="py-2 text-slate-500 text-xs">
                            {p.paid_at ? relativeTime(p.paid_at) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassSection>
          </div>

          {/* Right */}
          <div className="space-y-5">
            <GlassSection icon={<Wallet size={14} />} title="Payout" theme={theme}>
              <Field label="Method" value={marketer.payout_method || '—'} />
              <Field label="Account / phone" value={marketer.payout_identifier || '—'} mono />
              <Field label="Currency" value={marketer.payout_currency || 'USD'} />
            </GlassSection>

            <GlassSection icon={<ShieldCheck size={14} />} title="Earnings" theme={theme}>
              {(() => {
                const earned = stats.totalCommissionEarned;
                const paid = stats.totalPaid;
                const pending = stats.pendingPayouts;
                const outstanding = Math.max(0, earned - paid);
                const paidPct = earned > 0 ? Math.min(100, (paid / earned) * 100) : 0;

                return (
                  <div className="space-y-4">
                    {/* Hero — commission earned */}
                    <div>
                      <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">
                        Commission earned
                      </p>
                      <p className="text-3xl font-black tracking-tight bg-gradient-to-r from-emerald-300 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                        ${earned.toFixed(2)}
                      </p>
                    </div>

                    {/* Progress — paid vs earned */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">
                          Paid
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {paidPct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-800/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.55)] transition-all duration-500"
                          style={{ width: `${paidPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Breakdown chips */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-2.5">
                        <p className="text-[9px] uppercase text-slate-500 font-bold tracking-widest mb-0.5">
                          Paid out
                        </p>
                        <p className="text-sm font-bold text-slate-100">${paid.toFixed(2)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-2.5">
                        <p className="text-[9px] uppercase text-slate-500 font-bold tracking-widest mb-0.5">
                          Pending
                        </p>
                        <p className="text-sm font-bold text-amber-300">${pending.toFixed(2)}</p>
                      </div>
                      <div className="col-span-2 rounded-xl bg-slate-800/40 border border-slate-700/40 p-2.5">
                        <p className="text-[9px] uppercase text-slate-500 font-bold tracking-widest mb-0.5">
                          Outstanding
                        </p>
                        <p className={`text-sm font-bold ${outstanding > 0 ? 'text-rose-300' : 'text-slate-400'}`}>
                          ${outstanding.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </GlassSection>

            {/* Actions */}
            {(marketer.status === 'pending' || marketer.status === 'approved') && (
              <div className="relative rounded-2xl p-5 space-y-3 overflow-hidden bg-slate-900/80 border border-slate-800/60 shadow-xl backdrop-blur-md">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden />
                <p className="relative text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Actions
                </p>

                {marketer.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => doAction('approve')}
                      disabled={busy}
                      className="relative w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-sm disabled:opacity-40 shadow-[0_8px_30px_rgba(16,185,129,0.35)] hover:shadow-[0_8px_40px_rgba(16,185,129,0.55)] transition-all duration-300"
                    >
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                      Approve Marketer
                    </button>
                    <button
                      type="button"
                      onClick={() => doAction('reject')}
                      disabled={busy}
                      className="relative w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-300 font-bold text-sm disabled:opacity-40 transition-all duration-300"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </>
                )}

                {marketer.status === 'approved' && (
                  <button
                    type="button"
                    onClick={() => doAction('suspend')}
                    disabled={busy}
                    className="relative w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 font-bold text-sm disabled:opacity-40 transition-all duration-300"
                  >
                    <Ban size={14} /> Suspend
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GlassSection({
  icon, title, children, theme,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  theme: ReturnType<typeof getStatusTheme>;
}) {
  return (
    <div className={`relative rounded-2xl p-6 overflow-hidden bg-slate-900/80 border border-slate-800/60 shadow-xl backdrop-blur-md hover:border-purple-500/50 transition-all duration-300 group ${theme.sectionBorder}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden />
      <div className="relative flex items-center gap-3 mb-4">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl ${theme.chip}`}>
          {icon}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{title}</span>
      </div>
      <div className="relative space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value, mono, multiline }: { label: string; value: string; mono?: boolean; multiline?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">{label}</p>
      <p className={`text-sm text-slate-200 ${mono ? 'font-mono' : ''} ${multiline ? 'whitespace-pre-wrap' : 'truncate'}`}>
        {value}
      </p>
    </div>
  );
}

function KpiCard({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string; tint: string }) {
  return (
    <div className="relative rounded-2xl p-4 overflow-hidden bg-slate-900/80 border border-slate-800/60 shadow-lg backdrop-blur-md hover:border-purple-500/50 transition-all duration-300">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden />
      <div className="relative flex items-center gap-2 mb-2">
        <span className={`${tint}`}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      </div>
      <p className="relative text-2xl font-black text-slate-100 truncate">{value}</p>
    </div>
  );
}