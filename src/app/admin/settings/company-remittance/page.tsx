// src/app/admin/settings/company-remittance/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Save, AlertCircle, CheckCircle,
  Landmark, ShieldCheck, Copy, RefreshCw,
} from 'lucide-react';
import { relativeTime } from '@/lib/providers/format';

type RemittanceRow = {
  id: string;
  bank_name: string;
  account_holder: string;
  account_number: string;
  country: string;
  currency: string;
  swift_bic: string | null;
  branch_code: string | null;
  reference_template: string | null;
  is_active: boolean;
  verification_status: 'unverified' | 'pending' | 'verified' | 'failed';
  verified_at: string | null;
  updated_by_email: string | null;
  created_at: string;
  updated_at: string;
};

const EMPTY_FORM = {
  bank_name: '',
  account_holder: '',
  account_number: '',
  country: 'ZW',
  currency: 'USD',
  swift_bic: '',
  branch_code: '',
  reference_template: '',
};

export default function CompanyRemittancePage() {
  const [row, setRow] = useState<RemittanceRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/settings/company-remittance', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setRow(data.row);
      if (data.row) {
        setForm({
          bank_name: data.row.bank_name ?? '',
          account_holder: data.row.account_holder ?? '',
          account_number: data.row.account_number ?? '',
          country: data.row.country ?? 'ZW',
          currency: data.row.currency ?? 'USD',
          swift_bic: data.row.swift_bic ?? '',
          branch_code: data.row.branch_code ?? '',
          reference_template: data.row.reference_template ?? '',
        });
      } else {
        setForm(EMPTY_FORM);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!form.bank_name.trim())      { setError('Bank name is required'); return; }
    if (!form.account_holder.trim()) { setError('Account holder is required'); return; }
    if (!form.account_number.trim()) { setError('Account number is required'); return; }

    if (row) {
      const ok = confirm(
        'Replace the current active remittance account?\n\n' +
        'The existing row will be deactivated (kept for audit) and a new active row will be created. ' +
        'The new row starts as "unverified".'
      );
      if (!ok) return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/company-remittance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSuccess('Company remittance account saved. Verification status: unverified.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); } catch { /* ignore */ }
  };

  if (loading && !row && !form.bank_name) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[960px]">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link
          href="/admin/settings"
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
        >
          <ArrowLeft size={18} className="text-white/60" />
        </Link>
        <div className="flex-1 min-w-[240px]">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Landmark size={22} className="text-blue-400" />
            Company remittance account
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            The destination vendors send collections to. Used in contracts and vendor statements.
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
        <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
          <AlertCircle size={18} className="text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-300 flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-rose-400">×</button>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <CheckCircle size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-300 flex-1">{success}</p>
          <button onClick={() => setSuccess('')} className="text-emerald-400">×</button>
        </div>
      )}

      {/* Current active */}
      {row ? (
        <div className="relative rounded-2xl p-5 overflow-hidden bg-slate-900/80 border border-slate-800/60 shadow-xl backdrop-blur-md ring-1 ring-emerald-500/10">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden />
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Currently active
            </span>
            <span className={`ml-auto px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
              row.verification_status === 'verified'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : row.verification_status === 'pending'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : row.verification_status === 'failed'
                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                    : 'bg-slate-500/10 text-slate-300 border-slate-500/30'
            }`}>
              {row.verification_status}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <ReadOnlyField label="Bank" value={row.bank_name} />
            <ReadOnlyField label="Account holder" value={row.account_holder} />
            <ReadOnlyField label="Account number" value={row.account_number} mono onCopy={() => copy(row.account_number)} />
            <ReadOnlyField label="Currency" value={row.currency} />
            <ReadOnlyField label="Country" value={row.country} />
            {row.swift_bic && <ReadOnlyField label="SWIFT / BIC" value={row.swift_bic} mono />}
            {row.branch_code && <ReadOnlyField label="Branch code" value={row.branch_code} mono />}
            {row.reference_template && <ReadOnlyField label="Reference template" value={row.reference_template} mono />}
          </div>
          <p className="text-[10px] text-slate-500 mt-4 pt-3 border-t border-slate-800/60">
            Last updated by <span className="text-slate-400">{row.updated_by_email || 'admin'}</span> · {relativeTime(row.updated_at)}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-center">
          <AlertCircle size={28} className="text-amber-400 mx-auto mb-2" />
          <p className="text-sm text-amber-200 font-bold">No active remittance account configured</p>
          <p className="text-xs text-amber-300/70 mt-1">
            Fill in the form below to set GlobalHub's receiving account.
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={save} className="relative rounded-2xl p-6 overflow-hidden bg-slate-900/80 border border-slate-800/60 shadow-xl backdrop-blur-md">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden />
        <div className="flex items-center gap-2 mb-4">
          <Landmark size={14} className="text-blue-400" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {row ? 'Replace active account' : 'Configure account'}
          </span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Bank name" required>
              <input
                type="text"
                value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                placeholder="e.g. CBZ Bank"
                className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/60 hover:border-blue-500/40 focus:border-blue-500/60 focus:outline-none rounded-xl text-sm text-slate-100 transition-colors"
              />
            </FormField>

            <FormField label="Account holder" required>
              <input
                type="text"
                value={form.account_holder}
                onChange={(e) => setForm({ ...form, account_holder: e.target.value })}
                placeholder="GlobalHub (Private) Limited"
                className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/60 hover:border-blue-500/40 focus:border-blue-500/60 focus:outline-none rounded-xl text-sm text-slate-100 transition-colors"
              />
            </FormField>

            <FormField label="Account number" required>
              <input
                type="text"
                value={form.account_number}
                onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                placeholder="0123456789"
                className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/60 hover:border-blue-500/40 focus:border-blue-500/60 focus:outline-none rounded-xl text-sm font-mono text-slate-100 transition-colors"
              />
            </FormField>

            <FormField label="Currency" required>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/60 hover:border-blue-500/40 focus:border-blue-500/60 focus:outline-none rounded-xl text-sm text-slate-100 transition-colors cursor-pointer"
              >
                <option value="USD" className="bg-slate-900">USD</option>
                <option value="ZWL" className="bg-slate-900">ZWL</option>
                <option value="EUR" className="bg-slate-900">EUR</option>
              </select>
            </FormField>

            <FormField label="Country">
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="ZW"
                className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/60 hover:border-blue-500/40 focus:border-blue-500/60 focus:outline-none rounded-xl text-sm text-slate-100 transition-colors"
              />
            </FormField>

            <FormField label="SWIFT / BIC">
              <input
                type="text"
                value={form.swift_bic}
                onChange={(e) => setForm({ ...form, swift_bic: e.target.value })}
                placeholder="COBZZWHA"
                className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/60 hover:border-blue-500/40 focus:border-blue-500/60 focus:outline-none rounded-xl text-sm font-mono text-slate-100 transition-colors"
              />
            </FormField>

            <FormField label="Branch code">
              <input
                type="text"
                value={form.branch_code}
                onChange={(e) => setForm({ ...form, branch_code: e.target.value })}
                placeholder="Optional"
                className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/60 hover:border-blue-500/40 focus:border-blue-500/60 focus:outline-none rounded-xl text-sm font-mono text-slate-100 transition-colors"
              />
            </FormField>

            <FormField label="Reference template">
              <input
                type="text"
                value={form.reference_template}
                onChange={(e) => setForm({ ...form, reference_template: e.target.value })}
                placeholder="GH-{vendor_code}-{yyyymm}"
                className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/60 hover:border-blue-500/40 focus:border-blue-500/60 focus:outline-none rounded-xl text-sm font-mono text-slate-100 transition-colors"
              />
            </FormField>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-slate-800/60">
            <p className="text-[10px] text-slate-500 flex-1 italic">
              New and replaced accounts start as <span className="text-amber-400">unverified</span>.
              Mark verified once the bank details have been confirmed out-of-band.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-black text-sm disabled:opacity-40 shadow-[0_8px_30px_rgba(59,130,246,0.35)] hover:shadow-[0_8px_40px_rgba(59,130,246,0.55)] transition-all duration-300"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {row ? 'Replace account' : 'Save account'}
            </button>
          </div>
        </div>
      </form>

      {/* Deferred features note */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4">
        <p className="text-[10px] text-slate-500 italic leading-relaxed">
          <span className="text-slate-400 font-bold">Not yet built:</span> verification workflow (mark verified/unverified),
          full audit-log viewer, and vendor-facing display of these instructions.
          These arrive in Phase 1C-3B / 1C-5.
        </p>
      </div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1.5">
        {label}{required && <span className="text-rose-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value, mono, onCopy }: { label: string; value: string; mono?: boolean; onCopy?: () => void }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <p className={`text-sm text-slate-200 ${mono ? 'font-mono' : ''} truncate`}>{value || '—'}</p>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="p-1 rounded-md text-slate-500 hover:text-slate-200 transition"
            title="Copy"
          >
            <Copy size={11} />
          </button>
        )}
      </div>
    </div>
  );
}