// src/app/admin/providers/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Mail, Phone, MapPin, Wallet, ShieldCheck,
  CheckCircle, XCircle, AlertCircle, Copy, Send, Building2, User as UserIcon,
} from 'lucide-react';
import {
  categoryIcon,
  payoutLabel,
  relativeTime,
  canApprove,
  complianceLabel,
  REQUIRED_COMPLIANCE,
  type ProviderApplication,
} from '@/lib/providers/format';
import { getStatusTheme } from '@/lib/admin/status-theme';

export default function ProviderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || '');

  const [app, setApp] = useState<ProviderApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/providers/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setApp(data.application as ProviderApplication);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const doApprove = async () => {
    if (!app) return;
    const check = canApprove(app);
    if (!check.allowed) { setError(check.reason || 'Cannot approve'); return; }
    if (!confirm(`Approve ${app.display_name} as a provider?`)) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/admin/providers/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Approved after manual review' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed');
      setSuccess(data.already_provider ? 'Provider already exists.' : 'Provider approved.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approval failed');
    } finally { setBusy(false); }
  };

  const doReject = async () => {
    if (!app) return;
    const reason = prompt('Reason for rejection (shown to applicant):');
    if (reason === null) return;
    if (!reason.trim()) { setError('Rejection reason required'); return; }
    setBusy(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/admin/providers/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rejection failed');
      setSuccess('Application rejected.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rejection failed');
    } finally { setBusy(false); }
  };

  const copyEmail = async () => {
    if (!app?.email) return;
    try {
      await navigator.clipboard.writeText(app.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const composeEmail = () => {
    if (!app?.email) return;
    const subject = encodeURIComponent(
      app.status === 'approved'
        ? 'Your GlobalHub provider application — approved'
        : 'Update on your GlobalHub provider application'
    );
    const body = encodeURIComponent(
      `Hi ${app.display_name || app.full_name},\n\n` +
      `Thank you for your interest in becoming a GlobalHub provider.\n\n` +
      `[Write your decision here]\n\n` +
      `Best regards,\nGlobalHub Team`
    );
    window.location.href = `mailto:${app.email}?subject=${subject}&body=${body}`;
  };

  if (loading && !app) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (error && !app) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-300 font-bold">{error}</p>
        <button
          onClick={() => router.push('/admin/providers')}
          className="mt-4 px-4 py-2 bg-emerald-500 text-black rounded-lg font-bold"
        >
          Back to Providers
        </button>
      </div>
    );
  }

  if (!app) return null;

  const approval = canApprove(app);
  const theme = getStatusTheme(app.status);

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
            href="/admin/providers"
            className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/60 hover:border-indigo-500/50 backdrop-blur-md transition-all duration-300 group"
          >
            <ArrowLeft size={18} className="text-slate-400 group-hover:text-slate-100 transition" />
          </Link>
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              {app.display_name || app.full_name}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {app.service_category} · Submitted {relativeTime(app.created_at)}
            </p>
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

        {/* Glass contact bar */}
        <div className={`relative rounded-2xl p-5 flex items-center justify-between flex-wrap gap-3 overflow-hidden bg-slate-900/80 border border-slate-800/60 shadow-xl backdrop-blur-md ${theme.headerRing}`}>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden />
          <div className="relative flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Mail size={14} className="text-slate-500" />
              <span className="text-slate-200 font-mono">{app.email}</span>
            </div>
            {app.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone size={14} className="text-slate-500" />
                <span className="text-slate-200 font-mono">{app.phone}</span>
              </div>
            )}
            {app.country && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={14} className="text-slate-500" />
                <span className="text-slate-200">{app.country}</span>
              </div>
            )}
          </div>
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={copyEmail}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 text-xs font-bold text-slate-300 hover:text-slate-100 transition-all duration-300"
            >
              <Copy size={12} /> {copied ? 'Copied!' : 'Copy email'}
            </button>
            <button
              type="button"
              onClick={composeEmail}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 text-xs font-bold text-slate-300 hover:text-slate-100 transition-all duration-300"
            >
              <Send size={12} /> Compose reply
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <GlassSection icon={<UserIcon size={14} />} title="Applicant" theme={theme}>
              <Field label="Full name" value={app.full_name} />
              <Field label="Display name" value={app.display_name} />
              <Field label="Email" value={app.email} mono />
              <Field label="Phone" value={app.phone || '—'} mono />
              <Field label="Country" value={app.country || '—'} />
              <Field label="WhatsApp" value={app.whatsapp || '—'} mono />
              <Field label="Facebook" value={app.facebook || '—'} />
              <Field label="LinkedIn" value={app.linkedin || '—'} />
              <Field label="Twitter" value={app.twitter || '—'} />
            </GlassSection>

            <GlassSection icon={<Building2 size={14} />} title="Service" theme={theme}>
              <Field label="Category" value={`${categoryIcon(app.service_category)} ${app.service_category}`} />
              <Field label="Title" value={app.service_title} />
              <Field label="Description" value={app.service_description || '—'} multiline />
              <Field label="Pricing" value={app.pricing_structure || '—'} multiline />
              <Field label="Refund policy" value={app.refund_policy || '—'} multiline />
              <Field label="Expected outcome" value={app.expected_outcome || '—'} multiline />
              <Field label="Support method" value={app.support_method || '—'} />
            </GlassSection>
          </div>

          <div className="space-y-5">
            <GlassSection icon={<Wallet size={14} />} title="Payout" theme={theme}>
              <Field label="Method" value={payoutLabel(app.payout_method)} />
              <Field label="Account name" value={app.payout_name || '—'} />
              <Field label="Account / phone" value={app.payout_identifier || '—'} mono />
              <Field label="Currency" value={app.payout_currency || 'USD'} />
            </GlassSection>

            <GlassSection icon={<ShieldCheck size={14} />} title="Compliance" theme={theme}>
              <div className="space-y-2">
                {REQUIRED_COMPLIANCE.map(key => {
                  const accepted = !!app[key];
                  return (
                    <div key={String(key)} className="flex items-center gap-2 text-xs">
                      {accepted ? (
                        <CheckCircle size={12} className="text-emerald-400" />
                      ) : (
                        <XCircle size={12} className="text-rose-400" />
                      )}
                      <span className={accepted ? 'text-slate-300' : 'text-rose-300'}>
                        {complianceLabel(String(key))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </GlassSection>

            {app.status === 'pending' && (
              <div className="relative rounded-2xl p-5 space-y-3 overflow-hidden bg-slate-900/80 border border-slate-800/60 shadow-xl backdrop-blur-md">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden />
                <p className="relative text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Actions
                </p>
                <button
                  type="button"
                  onClick={doApprove}
                  disabled={busy || !approval.allowed}
                  className="relative w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-sm disabled:opacity-40 shadow-[0_8px_30px_rgba(16,185,129,0.35)] hover:shadow-[0_8px_40px_rgba(16,185,129,0.55)] transition-all duration-300"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Approve Provider
                </button>
                {!approval.allowed && (
                  <p className="relative text-[11px] text-amber-300/80">{approval.reason}</p>
                )}
                <button
                  type="button"
                  onClick={doReject}
                  disabled={busy}
                  className="relative w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-300 font-bold text-sm disabled:opacity-40 transition-all duration-300"
                >
                  <XCircle size={14} /> Reject
                </button>
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
    <div className={`relative rounded-2xl p-6 overflow-hidden bg-slate-900/80 border border-slate-800/60 shadow-xl backdrop-blur-md hover:border-indigo-500/50 transition-all duration-300 group ${theme.sectionBorder}`}>
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