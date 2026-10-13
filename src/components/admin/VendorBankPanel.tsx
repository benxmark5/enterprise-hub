// src/components/admin/VendorBankPanel.tsx
'use client';

import { useState } from 'react';
import {
  Landmark, Loader2, Plus, Pencil, Trash2, ShieldCheck,
  ShieldOff, AlertCircle, CheckCircle, Star, X,
} from 'lucide-react';
import { relativeTime } from '@/lib/providers/format';
import type { StatusTheme } from '@/lib/admin/status-theme';

export type BankAccount = {
  id: string;
  bank_name: string;
  account_holder: string;
  account_number: string;
  branch_code: string | null;
  swift_bic: string | null;
  iban: string | null;
  country: string;
  currency: string;
  is_primary: boolean;
  verification_status: 'unverified' | 'pending' | 'verified' | 'failed';
  verified_at: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<BankAccount['verification_status'], string> = {
  unverified: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  pending:    'bg-amber-500/10 text-amber-300 border-amber-500/30',
  verified:   'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  failed:     'bg-rose-500/10 text-rose-300 border-rose-500/30',
};

type FormState = {
  bank_name: string;
  account_holder: string;
  account_number: string;
  branch_code: string;
  swift_bic: string;
  iban: string;
  country: string;
  currency: string;
  is_primary: boolean;
};

const EMPTY_FORM: FormState = {
  bank_name: '',
  account_holder: '',
  account_number: '',
  branch_code: '',
  swift_bic: '',
  iban: '',
  country: 'ZW',
  currency: 'USD',
  is_primary: false,
};

export default function VendorBankPanel({
  vendorId,
  accounts,
  theme,
  onChanged,
  isEditable,
}: {
  vendorId: string;
  accounts: BankAccount[];
  theme: StatusTheme;
  onChanged: () => void | Promise<void>;
  isEditable: boolean;
}) {
  const [mode, setMode] = useState<'idle' | 'add' | 'edit'>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [busyAccountId, setBusyAccountId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetMessages = () => { setError(''); setSuccess(''); };

  const startAdd = () => {
    resetMessages();
    setForm(EMPTY_FORM);
    setEditingId(null);
    setMode('add');
  };

  const startEdit = (acc: BankAccount) => {
    resetMessages();
    setForm({
      bank_name: acc.bank_name,
      account_holder: acc.account_holder,
      account_number: acc.account_number,
      branch_code: acc.branch_code ?? '',
      swift_bic: acc.swift_bic ?? '',
      iban: acc.iban ?? '',
      country: acc.country,
      currency: acc.currency,
      is_primary: acc.is_primary,
    });
    setEditingId(acc.id);
    setMode('edit');
  };

  const cancelForm = () => {
    resetMessages();
    setMode('idle');
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!form.bank_name.trim())      { setError('Bank name is required'); return; }
    if (!form.account_holder.trim()) { setError('Account holder is required'); return; }
    if (!form.account_number.trim()) { setError('Account number is required'); return; }

    setBusy(true);
    try {
      const url = mode === 'edit' && editingId
        ? `/api/admin/vendors/${vendorId}/bank-accounts/${editingId}`
        : `/api/admin/vendors/${vendorId}/bank-accounts`;

      const method = mode === 'edit' ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSuccess(mode === 'edit' ? 'Bank account updated.' : 'Bank account added.');
      setMode('idle');
      setEditingId(null);
      setForm(EMPTY_FORM);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const doVerify = async (acc: BankAccount, next: 'verified' | 'unverified' | 'failed') => {
    const label = next === 'verified' ? 'mark as verified' : next === 'unverified' ? 'reset to unverified' : 'mark as failed';
    if (!confirm(`Are you sure you want to ${label}?`)) return;
    setBusyAccountId(acc.id); resetMessages();
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/bank-accounts/${acc.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setSuccess(`Account ${next}.`);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyAccountId(null);
    }
  };

  const doDelete = async (acc: BankAccount) => {
    if (!confirm(`Remove bank account ${acc.bank_name} ····${acc.account_number.slice(-4)}?`)) return;
    setBusyAccountId(acc.id); resetMessages();
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/bank-accounts/${acc.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setSuccess('Bank account removed.');
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusyAccountId(null);
    }
  };

  const makePrimary = async (acc: BankAccount) => {
    if (acc.is_primary) return;
    setBusyAccountId(acc.id); resetMessages();
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/bank-accounts/${acc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_primary: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setSuccess('Primary account updated.');
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyAccountId(null);
    }
  };

  return (
    <div className={`relative rounded-2xl p-6 overflow-hidden bg-slate-900/80 border border-slate-800/60 shadow-xl backdrop-blur-md ${theme.sectionBorder}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden />

      {/* Header */}
      <div className="relative flex items-center gap-3 mb-4">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl ${theme.chip}`}>
          <Landmark size={14} />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Bank accounts
        </span>
        <span className="ml-auto text-[10px] text-slate-500">
          {accounts.length} account{accounts.length === 1 ? '' : 's'}
        </span>
        {isEditable && mode === 'idle' && (
          <button
            type="button"
            onClick={startAdd}
            className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 text-[10px] font-bold uppercase tracking-wider text-blue-300 transition"
          >
            <Plus size={10} /> Add
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="relative flex items-start gap-2 p-3 mb-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
          <AlertCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-300 flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-rose-400 text-xs">×</button>
        </div>
      )}
      {success && (
        <div className="relative flex items-start gap-2 p-3 mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-300 flex-1">{success}</p>
          <button onClick={() => setSuccess('')} className="text-emerald-400 text-xs">×</button>
        </div>
      )}

      {/* Form */}
      {isEditable && mode !== 'idle' && (
        <form onSubmit={save} className="relative mb-5 p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {mode === 'edit' ? 'Edit account' : 'New account'}
            </p>
            <button type="button" onClick={cancelForm} className="text-slate-400 hover:text-slate-200 transition">
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Bank name" required>
              <input
                type="text"
                value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                placeholder="e.g. CBZ Bank"
                className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/60 focus:border-blue-500/60 focus:outline-none rounded-lg text-xs text-slate-100 transition-colors"
              />
            </Field>

            <Field label="Account holder" required>
              <input
                type="text"
                value={form.account_holder}
                onChange={(e) => setForm({ ...form, account_holder: e.target.value })}
                placeholder="Tendai Moyo"
                className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/60 focus:border-blue-500/60 focus:outline-none rounded-lg text-xs text-slate-100 transition-colors"
              />
            </Field>

            <Field label="Account number" required>
              <input
                type="text"
                value={form.account_number}
                onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                placeholder="0123456789"
                className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/60 focus:border-blue-500/60 focus:outline-none rounded-lg text-xs font-mono text-slate-100 transition-colors"
              />
            </Field>

            <Field label="Currency">
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/60 focus:border-blue-500/60 focus:outline-none rounded-lg text-xs text-slate-100 cursor-pointer transition-colors"
              >
                <option value="USD" className="bg-slate-900">USD</option>
                <option value="ZWL" className="bg-slate-900">ZWL</option>
                <option value="EUR" className="bg-slate-900">EUR</option>
              </select>
            </Field>

            <Field label="Country">
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="ZW"
                className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/60 focus:border-blue-500/60 focus:outline-none rounded-lg text-xs text-slate-100 transition-colors"
              />
            </Field>

            <Field label="Branch code">
              <input
                type="text"
                value={form.branch_code}
                onChange={(e) => setForm({ ...form, branch_code: e.target.value })}
                placeholder="Optional"
                className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/60 focus:border-blue-500/60 focus:outline-none rounded-lg text-xs font-mono text-slate-100 transition-colors"
              />
            </Field>

            <Field label="SWIFT / BIC">
              <input
                type="text"
                value={form.swift_bic}
                onChange={(e) => setForm({ ...form, swift_bic: e.target.value })}
                placeholder="COBZZWHA"
                className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/60 focus:border-blue-500/60 focus:outline-none rounded-lg text-xs font-mono text-slate-100 transition-colors"
              />
            </Field>

            <Field label="IBAN">
              <input
                type="text"
                value={form.iban}
                onChange={(e) => setForm({ ...form, iban: e.target.value })}
                placeholder="Optional"
                className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/60 focus:border-blue-500/60 focus:outline-none rounded-lg text-xs font-mono text-slate-100 transition-colors"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={form.is_primary}
              onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
              className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-900/60 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-[11px] text-slate-300">Set as primary account</span>
          </label>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60">
            <button
              type="button"
              onClick={cancelForm}
              disabled={busy}
              className="px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs font-bold text-slate-300 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-black text-xs disabled:opacity-40 shadow-[0_8px_30px_rgba(59,130,246,0.35)] hover:shadow-[0_8px_40px_rgba(59,130,246,0.55)] transition-all duration-300"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : null}
              {mode === 'edit' ? 'Save changes' : 'Add account'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {accounts.length === 0 ? (
        <p className="relative text-sm text-slate-500 italic">
          No bank accounts recorded yet.
        </p>
      ) : (
        <div className="relative space-y-2">
          {accounts.map(acc => {
            const accBusy = busyAccountId === acc.id;
            return (
              <div
                key={acc.id}
                className={`rounded-xl bg-slate-800/40 border p-3 transition ${
                  acc.is_primary ? 'border-blue-500/40' : 'border-slate-700/40 hover:border-slate-600/60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    acc.is_primary ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-900/60 text-slate-400'
                  }`}>
                    {acc.is_primary ? <Star size={14} /> : <Landmark size={14} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-100 truncate">{acc.bank_name}</p>
                      {acc.is_primary && (
                        <span className="inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          primary
                        </span>
                      )}
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${STATUS_STYLES[acc.verification_status]}`}>
                        {acc.verification_status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                      {acc.account_holder} · {acc.account_number}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {acc.currency} · {acc.country}
                      {acc.swift_bic && ` · SWIFT ${acc.swift_bic}`}
                      {acc.verified_at && ` · verified ${relativeTime(acc.verified_at)}`}
                    </p>
                  </div>

                  {isEditable && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!acc.is_primary && (
                        <button
                          type="button"
                          onClick={() => makePrimary(acc)}
                          disabled={accBusy}
                          title="Set as primary"
                          className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-700/60 hover:border-blue-500/50 text-slate-400 hover:text-blue-300 transition disabled:opacity-40"
                        >
                          <Star size={12} />
                        </button>
                      )}

                      {acc.verification_status !== 'verified' ? (
                        <button
                          type="button"
                          onClick={() => doVerify(acc, 'verified')}
                          disabled={accBusy}
                          title="Mark verified"
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 transition disabled:opacity-40"
                        >
                          <ShieldCheck size={12} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => doVerify(acc, 'unverified')}
                          disabled={accBusy}
                          title="Reset to unverified"
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 transition disabled:opacity-40"
                        >
                          <ShieldOff size={12} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => startEdit(acc)}
                        disabled={accBusy}
                        title="Edit"
                        className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-700/60 hover:border-blue-500/50 text-slate-400 hover:text-blue-300 transition disabled:opacity-40"
                      >
                        <Pencil size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={() => doDelete(acc)}
                        disabled={accBusy}
                        title="Remove"
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-300 transition disabled:opacity-40"
                      >
                        {accBusy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="relative text-[10px] text-slate-500 italic mt-4 pt-3 border-t border-slate-800/60">
        Editing bank details resets verification. Only one account can be primary at a time.
      </p>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">
        {label}{required && <span className="text-rose-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}