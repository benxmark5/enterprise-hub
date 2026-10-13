// src/components/admin/VendorKycPanel.tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload, Loader2, FileText, CheckCircle, XCircle, Download,
  AlertCircle, Trash2, ShieldCheck,
} from 'lucide-react';
import { relativeTime } from '@/lib/providers/format';
import type { StatusTheme } from '@/lib/admin/status-theme';

export type KycDocType =
  | 'national_id'
  | 'passport'
  | 'business_registration'
  | 'tax_id'
  | 'proof_of_address';

export type KycDocStatus = 'pending' | 'verified' | 'rejected' | 'expired';

export type KycDoc = {
  id: string;
  doc_type: KycDocType;
  status: KycDocStatus;
  storage_path: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  reviewed_at: string | null;
  rejection_note: string | null;
  created_at: string;
};

const DOC_LABELS: Record<KycDocType, string> = {
  national_id: 'National ID',
  passport: 'Passport',
  business_registration: 'Business registration',
  tax_id: 'Tax ID',
  proof_of_address: 'Proof of address',
};

const DOC_STATUS_STYLES: Record<KycDocStatus, string> = {
  pending:  'bg-amber-500/10 text-amber-300 border-amber-500/30',
  verified: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  rejected: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  expired:  'bg-slate-500/10 text-slate-300 border-slate-500/30',
};

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];

function formatBytes(n: number | null): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function VendorKycPanel({
  vendorId,
  documents,
  theme,
  onChanged,
  isEditable,
}: {
  vendorId: string;
  documents: KycDoc[];
  theme: StatusTheme;
  onChanged: () => void | Promise<void>;
  isEditable: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<KycDocType>('national_id');
  const [uploading, setUploading] = useState(false);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetMessages = () => { setError(''); setSuccess(''); };

  const handleUpload = useCallback(async (file: File) => {
    resetMessages();

    if (!ALLOWED_MIME.includes(file.type)) {
      setError('Invalid file type. Allowed: PDF, JPEG, PNG.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('File too large (max 10 MB).');
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('doc_type', docType);
      form.append('file', file);

      const res = await fetch(`/api/admin/vendors/${vendorId}/kyc`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setSuccess(`${DOC_LABELS[docType]} uploaded.`);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [docType, vendorId, onChanged]);

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleUpload(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleUpload(f);
  };

  const doVerify = async (docId: string) => {
    if (!confirm('Mark this document as verified?')) return;
    setBusyDocId(docId); resetMessages();
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/kyc/${docId}/verify`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verify failed');
      setSuccess('Document verified.');
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verify failed');
    } finally {
      setBusyDocId(null);
    }
  };

  const doReject = async (docId: string) => {
    const reason = prompt('Reason for rejecting this document:');
    if (reason === null) return;
    if (!reason.trim()) { setError('Rejection reason required'); return; }
    setBusyDocId(docId); resetMessages();
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/kyc/${docId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reject failed');
      setSuccess('Document rejected.');
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setBusyDocId(null);
    }
  };

  const doDownload = async (docId: string) => {
    setBusyDocId(docId); resetMessages();
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/kyc/${docId}/download`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Download failed');
      window.open(data.url, '_blank', 'noopener');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setBusyDocId(null);
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
          KYC documents
        </span>
        <span className="ml-auto text-[10px] text-slate-500">
          {documents.length} file{documents.length === 1 ? '' : 's'}
        </span>
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

      {/* Upload zone */}
      {isEditable && (
        <div className="relative mb-5">
          <div className="flex items-center gap-2 mb-2">
            <label className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">
              Document type
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as KycDocType)}
              disabled={uploading}
              className="ml-auto appearance-none px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 hover:border-blue-500/50 focus:border-blue-500/60 focus:outline-none text-xs text-slate-200 cursor-pointer transition-colors disabled:opacity-50"
            >
              {(Object.keys(DOC_LABELS) as KycDocType[]).map(k => (
                <option key={k} value={k} className="bg-slate-900 text-white">
                  {DOC_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`relative rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer p-6 text-center ${
              dragActive
                ? 'border-blue-500/60 bg-blue-500/5'
                : 'border-slate-700/60 hover:border-blue-500/40 hover:bg-slate-800/30'
            } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={onFileSelected}
              className="hidden"
            />
            {uploading ? (
              <>
                <Loader2 size={24} className="text-blue-400 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">Uploading…</p>
              </>
            ) : (
              <>
                <Upload size={24} className="text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-slate-300 font-bold">
                  Drop a file or click to browse
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  PDF, JPEG, or PNG · up to 10 MB
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Document list */}
      {documents.length === 0 ? (
        <p className="relative text-sm text-slate-500 italic">
          No documents uploaded yet.
        </p>
      ) : (
        <div className="relative space-y-2">
          {documents.map(d => {
            const busy = busyDocId === d.id;
            return (
              <div
                key={d.id}
                className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-3 hover:border-slate-600/60 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900/60 border border-slate-700/60 flex items-center justify-center flex-shrink-0">
                    <FileText size={14} className="text-slate-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-100">
                        {DOC_LABELS[d.doc_type]}
                      </p>
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${DOC_STATUS_STYLES[d.status]}`}>
                        {d.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                      {d.file_name || d.storage_path}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {formatBytes(d.file_size)} · uploaded {relativeTime(d.created_at)}
                      {d.reviewed_at && ` · reviewed ${relativeTime(d.reviewed_at)}`}
                    </p>
                    {d.rejection_note && (
                      <p className="text-[10px] text-rose-300/80 mt-1 italic">
                        {d.rejection_note}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => doDownload(d.id)}
                      disabled={busy}
                      title="Download (5-min link)"
                      className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-700/60 hover:border-blue-500/50 text-slate-400 hover:text-blue-300 transition disabled:opacity-40"
                    >
                      {busy ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                    </button>

                    {isEditable && d.status !== 'verified' && (
                      <button
                        type="button"
                        onClick={() => doVerify(d.id)}
                        disabled={busy}
                        title="Mark verified"
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 transition disabled:opacity-40"
                      >
                        <ShieldCheck size={12} />
                      </button>
                    )}

                    {isEditable && d.status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() => doReject(d.id)}
                        disabled={busy}
                        title="Reject"
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-300 transition disabled:opacity-40"
                      >
                        <XCircle size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Retention note */}
      <p className="relative text-[10px] text-slate-500 italic mt-4 pt-3 border-t border-slate-800/60">
        Files are stored in a private, admin-only bucket. Downloads use signed URLs that expire after 5 minutes.
      </p>
    </div>
  );
}