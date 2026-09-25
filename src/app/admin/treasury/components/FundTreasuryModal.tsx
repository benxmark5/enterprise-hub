// src/app/admin/treasury/components/FundTreasuryModal.tsx
'use client';

import { useState } from 'react';
import { X, Loader2, Coins } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function FundTreasuryModal({ open, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'KES' | 'USD'>('KES');
  const [reference, setReference] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!open) return null;

  const submit = async () => {
    setError('');
    setSuccess('');

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid amount');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/admin/fund-treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          currency,
          reference: reference.trim() || undefined,
          description: description.trim() || undefined,
          method,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Funding failed');
        return;
      }
      setSuccess(`Funded. New ${currency} balance: ${Number(data.new_balance).toLocaleString()}`);
      setAmount('');
      setReference('');
      setDescription('');
      setTimeout(() => {
        onSuccess();
        setSuccess('');
        onClose();
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={() => !busy && onClose()}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-amber-500/20 bg-[#0d1420] p-6 relative"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/50"
        >
          <X size={14} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Coins size={18} className="text-amber-400" />
          <h2 className="text-lg font-black text-white">Fund Treasury</h2>
        </div>
        <p className="text-xs text-white/40 mb-5">
          Add operational funds to the company treasury. Creates an auditable ledger entry.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
              Currency
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['KES', 'USD'] as const).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  disabled={busy}
                  className={`py-2 rounded-lg border text-sm font-bold transition ${
                    currency === c
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
              Amount ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              disabled={busy}
              placeholder="0.00"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-lg font-black tabular-nums text-white outline-none focus:border-amber-500/50"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
              Method
            </label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              disabled={busy}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
            >
              <option value="bank_transfer">Bank transfer</option>
              <option value="paystack">Paystack transfer</option>
              <option value="mpesa">M-Pesa</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
              Reference (optional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              disabled={busy}
              placeholder="Bank TXN ID, M-Pesa code..."
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={busy}
              rows={2}
              placeholder="e.g. Weekly operational top-up"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50 resize-none"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
              <p className="text-xs text-emerald-300">{success}</p>
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={busy || !amount}
            className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 py-3 font-black text-sm text-black disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? <><Loader2 size={14} className="animate-spin" /> Funding...</> : 'Confirm Funding'}
          </button>
        </div>
      </div>
    </div>
  );
}