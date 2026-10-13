// src/app/admin/vendors/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Mail, Phone, MapPin,
  CheckCircle, XCircle, AlertCircle, Wallet, ShieldCheck,
  User as UserIcon, History as HistoryIcon, Ban, RotateCcw,
  Percent, DollarSign, Landmark, Pencil,
} from 'lucide-react';
import { relativeTime } from '@/lib/providers/format';
import { getStatusTheme } from '@/lib/admin/status-theme';
import VendorKycPanel, { type KycDoc } from '@/components/admin/VendorKycPanel';
import VendorBankPanel, { type BankAccount } from '@/components/admin/VendorBankPanel';

type Vendor = {
  id: string;
  user_id: string | null;
  legal_name: string;
  display_name: string | null;
  entity_type: 'individual' | 'registered_business';
  business_registration_no: string | null;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  country: string;
  city: string | null;
  address: string | null;
  status:
    | 'application_started'
    | 'documents_submitted'
    | 'under_review'
    | 'info_required'
    | 'approved'
    | 'suspended'
    | 'rejected';
  rejection_reason: string | null;
  notes: string | null;
  settlement_method: 'full_remittance' | 'net_settlement';
  collection_currency: string;
  collection_limit_usd: number | null;
  commission_config: { percent?: number; fixed_usd?: number; version?: number };
  transaction_cost_policy: string;
  total_collected_usd: number;
  total_remitted_usd: number;
  outstanding_usd: number;
  total_earnings_usd: number;
  total_paid_usd: number;
  applied_at: string;
  reviewed_at: string | null;
  approved_at: string | null;
  suspended_at: string | null;
  rejected_at: string | null;
  contract_signed_at: string | null;
  created_at: string;
  updated_at: string;
};





type HistoryRow = {
  id: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  actor_email: string | null;
  created_at: string;
};

 






export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || '');

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [kyc, setKyc] = useState<KycDoc[]>([]);
  const [bank, setBank] = useState<BankAccount[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Commission editor
  const [commissionEditing, setCommissionEditing] = useState(false);
  const [commissionForm, setCommissionForm] = useState({ percent: '0', fixed_usd: '0', reason: '' });
  const [commissionBusy, setCommissionBusy] = useState(false);
  const [commissionError, setCommissionError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/admin/vendors/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setVendor(data.vendor as Vendor);
      setKyc(data.kycDocuments ?? []);
      setBank(data.bankAccounts ?? []);
      setHistory(data.history ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (kind: 'approve' | 'reject' | 'suspend' | 'reinstate') => {
    if (!vendor) return;

    let body: Record<string, string> = {};
    if (kind === 'approve') {
      if (!confirm(`Approve ${vendor.legal_name} as a vendor?`)) return;
      body = { note: 'Approved after manual review' };
    } else if (kind === 'reject') {
      const reason = prompt('Reason for rejection:');
      if (reason === null) return;
      if (!reason.trim()) { setError('Rejection reason required'); return; }
      body = { reason: reason.trim() };
    } else if (kind === 'suspend') {
      const reason = prompt('Reason for suspension (optional):') ?? '';
      body = { reason: reason.trim() };
    } else {
      const note = prompt('Reinstatement note (optional):') ?? '';
      body = { note: note.trim() || 'Reinstated by admin' };
    }

    setBusy(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/admin/vendors/${id}/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `${kind} failed`);
      const past = kind === 'approve' ? 'approved' : kind === 'reject' ? 'rejected' : kind === 'suspend' ? 'suspended' : 'reinstated';
      setSuccess(`Vendor ${past}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : `${kind} failed`);
    } finally {
      setBusy(false);
    }
  };

  const startCommissionEdit = () => {
    if (!vendor) return;
    const cfg = vendor.commission_config || {};
    setCommissionForm({
      percent: String(cfg.percent ?? 0),
      fixed_usd: String(cfg.fixed_usd ?? 0),
      reason: '',
    });
    setCommissionError('');
    setCommissionEditing(true);
  };

  const cancelCommissionEdit = () => {
    setCommissionEditing(false);
    setCommissionError('');
  };

  const saveCommission = async () => {
    if (!vendor) return;
    setCommissionError('');

    const percent = Number(commissionForm.percent);
    const fixed = Number(commissionForm.fixed_usd);
    const reason = commissionForm.reason.trim();

    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setCommissionError('Percent must be between 0 and 100');
      return;
    }
    if (!Number.isFinite(fixed) || fixed < 0) {
      setCommissionError('Fixed fee must be 0 or greater');
      return;
    }
    if (!reason) {
      setCommissionError('A reason is required for the audit trail');
      return;
    }

    setCommissionBusy(true);
    try {
      const res = await fetch(`/api/admin/vendors/${id}/commission`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percent, fixed_usd: fixed, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setSuccess('Commission rule updated.');
      setCommissionEditing(false);
      await load();
    } catch (e) {
      setCommissionError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setCommissionBusy(false);
    }
  };

  if (loading && !vendor) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (error && !vendor) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <p className="text-rose-300 font-bold">{error}</p>
        <button
          onClick={() => router.push('/admin/vendors')}
          className="mt-4 px-4 py-2 bg-blue-500 text-black rounded-lg font-bold"
        >
          Back to Vendors
        </button>
      </div>
    );
  }

  if (!vendor) return null;

  const theme = getStatusTheme(vendor.status);
  const canApprove = vendor.status !== 'approved' && vendor.status !== 'suspended';
  const canReject = vendor.status !== 'approved' && vendor.status !== 'rejected';
  const canSuspend = vendor.status === 'approved';
  const canReinstate = vendor.status === 'suspended';

  const commission = vendor.commission_config || {};
  const commissionLabel =
    commission.percent != null || commission.fixed_usd != null
      ? `${commission.percent ?? 0}% + $${(commission.fixed_usd ?? 0).toFixed(2)}`
      : 'Not configured';

  return (
    <div className="relative max-w-[1200px] bg-[#0B0F19] rounded-3xl p-6 -m-6">
      <div
        className={`pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[1100px] h-[520px] bg-gradient-to-b ${theme.pageGlow} blur-3xl`}
        aria-hidden
      />

      <div className="relative space-y-6">
        {/* Status bar */}
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
            href="/admin/vendors"
            className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/60 hover:border-blue-500/50 backdrop-blur-md transition-all duration-300 group"
          >
            <ArrowLeft size={18} className="text-slate-400 group-hover:text-slate-100 transition" />
          </Link>
          <div className="flex items-center gap-3 flex-1 min-w-[240px]">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-lg font-black flex-shrink-0 shadow-[0_0_24px_rgba(59,130,246,0.35)]">
              {(vendor.display_name || vendor.legal_name || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent truncate">
                {vendor.display_name || vendor.legal_name}
              </h1>
              <p className="text-sm text-slate-400 mt-0.5 truncate">
                {vendor.legal_name} · {vendor.entity_type === 'registered_business' ? 'Registered business' : 'Individual'} · Applied {relativeTime(vendor.applied_at)}
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

        {/* Contact bar */}
        <div className={`relative rounded-2xl p-5 flex items-center justify-between flex-wrap gap-3 overflow-hidden bg-slate-900/80 border border-slate-800/60 shadow-xl backdrop-blur-md ${theme.headerRing}`}>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden />
          <div className="relative flex items-center gap-4 flex-wrap">
            {vendor.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail size={14} className="text-slate-500" />
                <span className="text-slate-200 font-mono">{vendor.email}</span>
              </div>
            )}
            {vendor.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone size={14} className="text-slate-500" />
                <span className="text-slate-200 font-mono">{vendor.phone}</span>
              </div>
            )}
            {(vendor.city || vendor.country) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={14} className="text-slate-500" />
                <span className="text-slate-200">
                  {[vendor.city, vendor.country].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={<TrendingUpIcon />}
            label="Collected"
            value={`$${Number(vendor.total_collected_usd ?? 0).toFixed(2)}`}
            tint="text-emerald-400"
          />
          <KpiCard
            icon={<Landmark size={14} />}
            label="Remitted"
            value={`$${Number(vendor.total_remitted_usd ?? 0).toFixed(2)}`}
            tint="text-blue-400"
          />
          <KpiCard
            icon={<DollarSign size={14} />}
            label="Outstanding"
            value={`$${Number(vendor.outstanding_usd ?? 0).toFixed(2)}`}
            tint={Number(vendor.outstanding_usd ?? 0) > 0 ? 'text-amber-400' : 'text-slate-400'}
          />
          <KpiCard
            icon={<Percent size={14} />}
            label="Earnings"
            value={`$${Number(vendor.total_earnings_usd ?? 0).toFixed(2)}`}
            tint="text-purple-400"
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">
            <GlassSection icon={<UserIcon size={14} />} title="Vendor" theme={theme}>
              <Field label="Legal name" value={vendor.legal_name} />
              <Field label="Display name" value={vendor.display_name || '—'} />
              <Field label="Entity type" value={vendor.entity_type === 'registered_business' ? 'Registered business' : 'Individual'} />
              {vendor.business_registration_no && <Field label="Business reg. no." value={vendor.business_registration_no} mono />}
              {vendor.tax_id && <Field label="Tax ID" value={vendor.tax_id} mono />}
              <Field label="Email" value={vendor.email || '—'} mono />
              <Field label="Phone" value={vendor.phone || '—'} mono />
              {vendor.whatsapp && <Field label="WhatsApp" value={vendor.whatsapp} mono />}
              <Field label="Country" value={vendor.country} />
              <Field label="City" value={vendor.city || '—'} />
              {vendor.address && <Field label="Address" value={vendor.address} multiline />}
              {vendor.notes && <Field label="Admin notes" value={vendor.notes} multiline />}
              {vendor.rejection_reason && (
                <Field label="Rejection reason" value={vendor.rejection_reason} multiline />
              )}
            </GlassSection>

            <VendorKycPanel
  vendorId={id}
  documents={kyc}
  theme={theme}
  onChanged={load}
  isEditable={vendor.status !== 'rejected'}
/>

          <VendorBankPanel
  vendorId={id}
  accounts={bank as BankAccount[]}
  theme={theme}
  onChanged={load}
  isEditable={vendor.status !== 'rejected'}
/>

            <GlassSection icon={<HistoryIcon size={14} />} title="Status history" theme={theme}>
              {history.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No status changes recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {history.map(h => (
                    <div key={h.id} className="flex items-start gap-3 pb-3 border-b border-slate-800/60 last:border-0 last:pb-0">
                      <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        h.to_status === 'approved' ? 'bg-emerald-400' :
                        h.to_status === 'rejected' ? 'bg-rose-400' :
                        h.to_status === 'suspended' ? 'bg-slate-400' :
                        h.to_status === 'under_review' ? 'bg-violet-400' :
                        h.to_status === 'info_required' ? 'bg-orange-400' : 'bg-sky-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200">
                          <span className="text-slate-500">{h.from_status || 'new'}</span>
                          <span className="mx-2 text-slate-600">→</span>
                          <span className="font-bold">{h.to_status.replace(/_/g, ' ')}</span>
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
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <GlassSection icon={<ShieldCheck size={14} />} title="Settlement" theme={theme}>
              <Field label="Method" value={vendor.settlement_method === 'net_settlement' ? 'Net settlement' : 'Full remittance'} />
              <Field label="Currency" value={vendor.collection_currency} />
              {vendor.collection_limit_usd != null && (
                <Field label="Collection limit" value={`$${Number(vendor.collection_limit_usd).toFixed(2)}`} />
              )}
              <Field label="Cost policy" value={vendor.transaction_cost_policy.replace(/_/g, ' ')} />
            </GlassSection>

            <GlassSection icon={<Percent size={14} />} title="Commission" theme={theme}>
              {!commissionEditing ? (
                <>
                  <div>
                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">
                      Current arrangement
                    </p>
                    <p className="text-3xl font-black tracking-tight bg-gradient-to-r from-purple-300 via-violet-300 to-purple-400 bg-clip-text text-transparent">
                      {commissionLabel}
                    </p>
                  </div>
                  {commission.version != null && (
                    <Field label="Rule version" value={`v${commission.version}`} />
                  )}
                  {vendor.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={startCommissionEdit}
                      className="mt-1 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/50 text-purple-300 font-bold text-xs transition-all duration-300"
                    >
                      <Pencil size={12} /> Edit commission
                    </button>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">
                        Percent <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={commissionForm.percent}
                        onChange={(e) => setCommissionForm({ ...commissionForm, percent: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 focus:border-purple-500/60 focus:outline-none rounded-lg text-sm font-mono text-slate-100 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">
                        Fixed fee (USD)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={commissionForm.fixed_usd}
                        onChange={(e) => setCommissionForm({ ...commissionForm, fixed_usd: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 focus:border-purple-500/60 focus:outline-none rounded-lg text-sm font-mono text-slate-100 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">
                      Reason for change <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={commissionForm.reason}
                      onChange={(e) => setCommissionForm({ ...commissionForm, reason: e.target.value })}
                      placeholder="e.g. Annual review — volume increased"
                      className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700/60 focus:border-purple-500/60 focus:outline-none rounded-lg text-xs text-slate-100 transition-colors"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 italic">
                      Stored in the audit trail alongside the previous value.
                    </p>
                  </div>

                  {commissionError && (
                    <div className="flex items-start gap-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                      <AlertCircle size={14} className="text-rose-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-rose-300 flex-1">{commissionError}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                    <button
                      type="button"
                      onClick={cancelCommissionEdit}
                      disabled={commissionBusy}
                      className="px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs font-bold text-slate-300 transition disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveCommission}
                      disabled={commissionBusy}
                      className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-violet-400 text-black font-black text-xs disabled:opacity-40 shadow-[0_8px_30px_rgba(168,85,247,0.35)] hover:shadow-[0_8px_40px_rgba(168,85,247,0.55)] transition-all duration-300"
                    >
                      {commissionBusy ? <Loader2 size={12} className="animate-spin" /> : null}
                      Save
                    </button>
                  </div>
                </div>
              )}
            </GlassSection>

            <GlassSection icon={<Wallet size={14} />} title="Lifecycle" theme={theme}>
              <Field label="Applied" value={relativeTime(vendor.applied_at)} />
              {vendor.reviewed_at && <Field label="Reviewed" value={relativeTime(vendor.reviewed_at)} />}
              {vendor.approved_at && <Field label="Approved" value={relativeTime(vendor.approved_at)} />}
              {vendor.suspended_at && <Field label="Suspended" value={relativeTime(vendor.suspended_at)} />}
              {vendor.rejected_at && <Field label="Rejected" value={relativeTime(vendor.rejected_at)} />}
              {vendor.contract_signed_at && <Field label="Contract signed" value={relativeTime(vendor.contract_signed_at)} />}
              <Field label="Last updated" value={relativeTime(vendor.updated_at)} />
            </GlassSection>

            {/* Actions */}
            {(canApprove || canReject || canSuspend || canReinstate) && (
              <div className="relative rounded-2xl p-5 space-y-3 overflow-hidden bg-slate-900/80 border border-slate-800/60 shadow-xl backdrop-blur-md">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden />
                <p className="relative text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Actions
                </p>

                {canApprove && (
                  <button
                    type="button"
                    onClick={() => doAction('approve')}
                    disabled={busy}
                    className="relative w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-sm disabled:opacity-40 shadow-[0_8px_30px_rgba(16,185,129,0.35)] hover:shadow-[0_8px_40px_rgba(16,185,129,0.55)] transition-all duration-300"
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    Approve Vendor
                  </button>
                )}

                {canReject && (
                  <button
                    type="button"
                    onClick={() => doAction('reject')}
                    disabled={busy}
                    className="relative w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-300 font-bold text-sm disabled:opacity-40 transition-all duration-300"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                )}

                {canSuspend && (
                  <button
                    type="button"
                    onClick={() => doAction('suspend')}
                    disabled={busy}
                    className="relative w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 font-bold text-sm disabled:opacity-40 transition-all duration-300"
                  >
                    <Ban size={14} /> Suspend
                  </button>
                )}

                {canReinstate && (
                  <button
                    type="button"
                    onClick={() => doAction('reinstate')}
                    disabled={busy}
                    className="relative w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-black text-sm disabled:opacity-40 shadow-[0_8px_30px_rgba(59,130,246,0.35)] hover:shadow-[0_8px_40px_rgba(59,130,246,0.55)] transition-all duration-300"
                  >
                    <RotateCcw size={14} /> Reinstate
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

function TrendingUpIcon() {
  return <DollarSign size={14} />;
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
    <div className={`relative rounded-2xl p-6 overflow-hidden bg-slate-900/80 border border-slate-800/60 shadow-xl backdrop-blur-md hover:border-blue-500/50 transition-all duration-300 group ${theme.sectionBorder}`}>
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
    <div className="relative rounded-2xl p-4 overflow-hidden bg-slate-900/80 border border-slate-800/60 shadow-lg backdrop-blur-md hover:border-blue-500/50 transition-all duration-300">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden />
      <div className="relative flex items-center gap-2 mb-2">
        <span className={`${tint}`}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      </div>
      <p className="relative text-2xl font-black text-slate-100 truncate">{value}</p>
    </div>
  );
}