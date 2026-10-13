// src/components/admin/VendorContractPanel.tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import {
  FileText, Loader2, Upload, Download, CheckCircle, AlertCircle,
  Send, PenTool, History, Trash2, X,
} from 'lucide-react';
import { relativeTime } from '@/lib/providers/format';
import type { StatusTheme } from '@/lib/admin/status-theme';

export type ContractStatus = 'draft' | 'sent_to_vendor' | 'signed' | 'superseded' | 'voided';
export type ContractType = 'master_agreement' | 'addendum' | 'appendix';
export type SignatureMethod = 'wet_signature' | 'email_acceptance' | 'docusign' | 'manual_upload';

export type VendorContract = {
  id: string;
  contract_version: number;
  contract_type: ContractType;
  generated_by: 'manual_upload' | 'system_generated';
  unsigned_storage_path: string | null;
  unsigned_file_name: string | null;
  unsigned_file_size: number | null;
  unsigned_uploaded_at: string | null;
  signed_storage_path: string | null;
  signed_file_name: string | null;
  signed_file_size: number | null;
  signed_uploaded_at: string | null;
  signed_at: string | null;
  signed_by_name: string | null;
  signature_method: SignatureMethod | null;
  status: ContractStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_STYLES: Record<ContractStatus, string> = {
  draft:          'bg-slate-500/10 text-slate-300 border-slate-500/30',
  sent_to_vendor: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  signed:         'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  superseded:     'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
  voided:         'bg-rose-500/10 text-rose-300 border-rose-500/30',
};

const STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'Draft',
  sent_to_vendor: 'Sent to vendor',
  signed: 'Signed',
  superseded: 'Superseded',
  voided: 'Voided',
};

const TYPE_LABELS: Record<ContractType, string> = {
  master_agreement: 'Master agreement',
  addendum: 'Addendum',
  appendix: 'Appendix',
};

const METHOD_LABELS: Record<SignatureMethod, string> = {
  wet_signature: 'Wet signature',
  email_acceptance: 'Email acceptance',
  docusign: 'DocuSign',
  manual_upload: 'Manual upload',
};

const MAX_SIZE = 10 * 1024 * 1024;

function formatBytes(n: number | null): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function VendorContractPanel({
  vendorId,
  contracts,
  theme,
  onChanged,
  isEditable,
}: {
  vendorId: string;
  contracts: VendorContract[];
  theme: StatusTheme;
  onChanged: () => void | Promise<void>;
  isEditable: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const signedFileRef = useRef<HTMLInputElement>(null);

  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ contract_type: 'master_agreement' as ContractType, notes: '' });
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [signForm, setSignForm] = useState({ signed_by_name: '', signature_method: 'wet_signature' as SignatureMethod, signed_at: '', notes: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetMessages = () => { setError(''); setSuccess(''); };

  const activeContract = contracts.find(c => c.status === 'sent_to_vendor' || c.status === 'signed');
  const hasActive = !!activeContract;

  const onUpload = useCallback(async (file: File) => {
    resetMessages();
    if (file.type !== 'application/pdf') { setError('Only PDF contracts accepted'); return; }
    if (file.size > MAX_SIZE) { setError('File too large (max 10 MB)'); return; }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('contract_type', uploadForm.contract_type);
      if (uploadForm.notes.trim()) form.append('notes', uploadForm.notes.trim());

      const res = await fetch(`/api/admin/vendors/${vendorId}/contracts`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setSuccess('Contract uploaded.');
      setShowUpload(false);
      setUploadForm({ contract_type: 'master_agreement', notes: '' });
      if (fileRef.current) fileRef.current.value = '';
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [uploadForm, vendorId, onChanged]);

  const onSignedUpload = async (contractId: string, file: File) => {
    resetMessages();
    if (file.type !== 'application/pdf') { setError('Only PDF accepted'); return; }
    if (file.size > MAX_SIZE) { setError('File too large (max 10 MB)'); return; }

    setBusyId(contractId);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/admin/vendors/${vendorId}/contracts/${contractId}/upload-signed`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setSuccess('Signed copy attached. Now record the signature.');
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusyId(null);
      if (signedFileRef.current) signedFileRef.current.value = '';
    }
  };

  const startSign = (contract: VendorContract) => {
    resetMessages();
    setSigningId(contract.id);
    setSignForm({
      signed_by_name: contract.signed_by_name ?? '',
      signature_method: contract.signature_method ?? 'wet_signature',
      signed_at: contract.signed_at ? contract.signed_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes: contract.notes ?? '',
    });
  };

  const saveSign = async (contractId: string) => {
    resetMessages();
    if (!signForm.signed_by_name.trim()) { setError('Signed by name required'); return; }

    setBusyId(contractId);
    try {
      const signedAtIso = signForm.signed_at ? new Date(signForm.signed_at).toISOString() : new Date().toISOString();
      const res = await fetch(`/api/admin/vendors/${vendorId}/contracts/${contractId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signed_by_name: signForm.signed_by_name.trim(),
          signature_method: signForm.signature_method,
          signed_at: signedAtIso,
          notes: signForm.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sign failed');
      setSuccess('Contract marked signed.');
      setSigningId(null);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign failed');
    } finally {
      setBusyId(null);
    }
  };

  const download = async (contractId: string, kind: 'unsigned' | 'signed') => {
    setBusyId(contractId); resetMessages();
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/contracts/${contractId}/download?kind=${kind}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Download failed');
      window.open(data.url, '_blank', 'noopener');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={`relative rounded-2xl p-6 overflow-hidden bg-slate-900/80 border border-slate-800/60 shadow-xl backdrop-blur-md ${theme.sectionBorder}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden />

      {/* Header */}
      <div className="relative flex items-center gap-3 mb-4">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl ${theme.chip}`}>
          <FileText size={14} />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Contracts
        </span>
        <span className="ml-auto text-[10px] text-slate-500">
          {contracts.length} version{contracts.length === 1 ? '' : 's'}
        </span>
        {isEditable && !showUpload && (
          <button
            type="button"
            onClick={() => { setShowUpload(true); resetMessages(); }}
            className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 text-[10px] font-bold uppercase tracking-wider text-blue-300 transition"
          >
            <Upload size={10} /> Upload
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

      {/* Upload form */}
      {showUpload && (
        <div className="relative mb-5 p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              New contract version
            </p>
            <button type="button" onClick={() => setShowUpload(false)} className="text-slate-400 hover:text-slate-200 transition">
              <X size={14} />
            </button>
          </div>

          {hasActive && (
            <p className="text-[10px] text-amber-300/80 italic">
              Uploading will supersede v{activeContract!.contract_version} (currently {STATUS_LABELS[activeContract!.status]}).
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">
                Contract type
              </label>
              <select
                value={uploadForm.contract_type}
                onChange={(e) => setUploadForm({ ...uploadForm, contract_type: e.target.value as ContractType })}
                className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/60 focus:border-blue-500/60 focus:outline-none rounded-lg text-xs text-slate-100 cursor-pointer transition-colors"
              >
                <option value="master_agreement" className="bg-slate-900">Master agreement</option>
                <option value="addendum" className="bg-slate-900">Addendum</option>
                <option value="appendix" className="bg-slate-900">Appendix</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">
                Notes (internal)
              </label>
              <input
                type="text"
                value={uploadForm.notes}
                onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                placeholder="e.g. v1 sent for legal review"
                className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/60 focus:border-blue-500/60 focus:outline-none rounded-lg text-xs text-slate-100 transition-colors"
              />
            </div>
          </div>

          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void onUpload(f); }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-700/60 hover:border-blue-500/40 hover:bg-slate-800/30 text-xs font-bold text-slate-300 transition-all disabled:opacity-50"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? 'Uploading…' : 'Choose PDF file (max 10 MB)'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {contracts.length === 0 ? (
        <p className="relative text-sm text-slate-500 italic">
          No contracts uploaded yet.
        </p>
      ) : (
        <div className="relative space-y-2">
          {contracts.map(c => {
            const cBusy = busyId === c.id;
            const signing = signingId === c.id;
            const isActive = c.status === 'sent_to_vendor' || c.status === 'signed';
            return (
              <div
                key={c.id}
                className={`rounded-xl bg-slate-800/40 border p-3 transition ${
                  isActive ? 'border-blue-500/30' : 'border-slate-700/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    c.status === 'signed' ? 'bg-emerald-500/15 text-emerald-300' :
                    isActive ? 'bg-blue-500/15 text-blue-300' : 'bg-slate-900/60 text-slate-400'
                  }`}>
                    {c.status === 'signed' ? <PenTool size={14} /> : <FileText size={14} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-100">
                        v{c.contract_version} · {TYPE_LABELS[c.contract_type]}
                      </p>
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${STATUS_STYLES[c.status]}`}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </div>

                    {/* Unsigned row */}
                    {c.unsigned_storage_path && (
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="font-mono truncate">{c.unsigned_file_name ?? 'unsigned.pdf'}</span>
                        <span>·</span>
                        <span>{formatBytes(c.unsigned_file_size)}</span>
                        {c.unsigned_uploaded_at && (
                          <>
                            <span>·</span>
                            <span>uploaded {relativeTime(c.unsigned_uploaded_at)}</span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => download(c.id, 'unsigned')}
                          disabled={cBusy}
                          className="ml-1 text-blue-400 hover:text-blue-300 transition disabled:opacity-40"
                          title="Download unsigned"
                        >
                          <Download size={11} />
                        </button>
                      </div>
                    )}

                    {/* Signed row */}
                    {c.signed_storage_path && (
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-emerald-400/80">
                        <PenTool size={10} />
                        <span className="font-mono truncate">{c.signed_file_name ?? 'signed.pdf'}</span>
                        <span>·</span>
                        <span>{formatBytes(c.signed_file_size)}</span>
                        {c.signed_at && (
                          <>
                            <span>·</span>
                            <span>signed {relativeTime(c.signed_at)}</span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => download(c.id, 'signed')}
                          disabled={cBusy}
                          className="ml-1 text-emerald-400 hover:text-emerald-300 transition disabled:opacity-40"
                          title="Download signed"
                        >
                          <Download size={11} />
                        </button>
                      </div>
                    )}

                    {c.signed_by_name && (
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Signed by <span className="text-slate-300">{c.signed_by_name}</span>
                        {c.signature_method && <> · {METHOD_LABELS[c.signature_method]}</>}
                      </p>
                    )}

                    {c.notes && (
                      <p className="mt-1 text-[10px] text-slate-500 italic">{c.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  {isEditable && isActive && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {c.status !== 'signed' && !c.signed_storage_path && (
                        <>
                          <input
                            ref={signedFileRef}
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onSignedUpload(c.id, f); }}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => signedFileRef.current?.click()}
                            disabled={cBusy}
                            title="Upload signed copy"
                            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 text-blue-300 transition disabled:opacity-40"
                          >
                            {cBusy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                          </button>
                        </>
                      )}

                      {c.status !== 'signed' && c.signed_storage_path && !signing && (
                        <button
                          type="button"
                          onClick={() => startSign(c)}
                          disabled={cBusy}
                          title="Record signature"
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 transition disabled:opacity-40"
                        >
                          <PenTool size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Sign form */}
                {signing && (
                  <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Record signature
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={signForm.signed_by_name}
                        onChange={(e) => setSignForm({ ...signForm, signed_by_name: e.target.value })}
                        placeholder="Signed by (full name)"
                        className="md:col-span-2 px-3 py-2 bg-slate-900/60 border border-slate-700/60 focus:border-emerald-500/60 focus:outline-none rounded-lg text-xs text-slate-100 transition-colors"
                      />
                      <input
                        type="date"
                        value={signForm.signed_at}
                        onChange={(e) => setSignForm({ ...signForm, signed_at: e.target.value })}
                        className="px-3 py-2 bg-slate-900/60 border border-slate-700/60 focus:border-emerald-500/60 focus:outline-none rounded-lg text-xs text-slate-100 transition-colors"
                      />
                    </div>
                    <select
                      value={signForm.signature_method}
                      onChange={(e) => setSignForm({ ...signForm, signature_method: e.target.value as SignatureMethod })}
                      className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/60 focus:border-emerald-500/60 focus:outline-none rounded-lg text-xs text-slate-100 cursor-pointer transition-colors"
                    >
                      <option value="wet_signature" className="bg-slate-900">Wet signature</option>
                      <option value="email_acceptance" className="bg-slate-900">Email acceptance</option>
                      <option value="docusign" className="bg-slate-900">DocuSign</option>
                      <option value="manual_upload" className="bg-slate-900">Manual upload</option>
                    </select>
                    <input
                      type="text"
                      value={signForm.notes}
                      onChange={(e) => setSignForm({ ...signForm, notes: e.target.value })}
                      placeholder="Notes (optional)"
                      className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/60 focus:border-emerald-500/60 focus:outline-none rounded-lg text-xs text-slate-100 transition-colors"
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSigningId(null)}
                        className="px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs font-bold text-slate-300 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveSign(c.id)}
                        disabled={cBusy}
                        className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-xs disabled:opacity-40 transition"
                      >
                        {cBusy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                        Save signature
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="relative text-[10px] text-slate-500 italic mt-4 pt-3 border-t border-slate-800/60">
        Uploading a new version supersedes the current active contract. Old versions stay for audit.
      </p>
    </div>
  );
}