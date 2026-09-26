// src/app/admin/treasury/components/FundTreasuryModal.tsx
'use client';

import { useState } from 'react';
import { X, Loader2, Coins, ExternalLink, Landmark, Sliders } from 'lucide-react';

type Method = 'paystack_checkout' | 'manual_record' | 'adjustment';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function FundTreasuryModal({ open, onClose, onSuccess }: Props) {
  const [method, setMethod] = useState<Method>('paystack_checkout');
  const [currency, setCurrency] = useState<'KES' | 'USD'>('KES');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!open) return null;

  const reset = () => {
    setAmount('');
    setReference('');
    setDescription('');
    setError('');
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const toggleSign = () => {
    setAmount(a => (a.startsWith('-') ? a.slice(1) : '-' + (a || '')));
  };

  const submit = async () => {
    setError('');
    setSuccess('');

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt === 0) {
      setError('Enter a valid non-zero amount');
      return;
    }

    // ── Paystack checkout: redirect ──
    if (method === 'paystack_checkout') {
      if (amt <= 0) {
        setError('Amount must be positive for Paystack checkout');
        return;
      }
      setBusy(true);
      try {
        const res = await fetch('/api/admin/fund-treasury/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amt, currency }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok || !data.authorization_url) {
          setError(data.error || 'Could not start Paystack checkout');
          setBusy(false);
          return;
        }
        window.location.href = data.authorization_url;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
        setBusy(false);
      }
      return;
    }

    // ── Manual record: require reference ──
    if (method === 'manual_record' && !reference.trim()) {
      setError('Paystack reference is required for verified records');
      return;
    }
    if (method === 'manual_record' && amt < 0) {
      setError('Manual records must be positive. Use Adjustment to deduct.');
      return;
    }

    // ── Adjustment: require reason ──
    if (method === 'adjustment' && !description.trim()) {
      setError('Reason is required for adjustments');
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
        setError(data.error || 'Transaction failed');
        setBusy(false);
        return;
      }
      setSuccess(
        `Done. New ${currency} balance: ${Number(data.new_balance).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      );
      reset();
      setTimeout(() => {
        onSuccess();
        setSuccess('');
        onClose();
      }, 1400);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setBusy(false);
    }
  };

  const methodCards: Array<{
    id: Method;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
    tone: 'amber' | 'emerald' | 'zinc';
  }> = [
    {
      id: 'paystack_checkout',
      label: 'Pay with Paystack',
      subtitle: 'Card, M-Pesa, Airtel — instant credit',
      icon: <ExternalLink size={16} />,
      tone: 'amber',
    },
    {
      id: 'manual_record',
      label: 'Record Real Transfer',
      subtitle: 'Already sent via bank/M-Pesa — verified against Paystack',
      icon: <Landmark size={16} />,
      tone: 'emerald',
    },
    {
      id: 'adjustment',
      label: 'Adjustment',
      subtitle: 'Correction, opening balance, or deduct funds',
      icon: <Sliders size={16} />,
      tone: 'zinc',
    },
  ];

  const toneStyles = {
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/40',
      text: 'text-amber-300',
      icon: 'text-amber-400',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/40',
      text: 'text-emerald-300',
      icon: 'text-emerald-400',
    },
    zinc: {
      bg: 'bg-white/[0.06]',
      border: 'border-white/20',
      text: 'text-white',
      icon: 'text-white/60',
    },
  };

  const isAdjustment = method === 'adjustment';
  const isNegative = amount.startsWith('-');

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-amber-500/20 bg-[#0d1420] p-6 relative max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={handleClose}
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
          Add or adjust operational funds. Every entry is auditable and (for records) verified against Paystack.
        </p>

        {/* Method selector */}
        <div className="space-y-2 mb-5">
          {methodCards.map(m => {
            const selected = method === m.id;
            const t = toneStyles[m.tone];
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => { setMethod(m.id); setError(''); setSuccess(''); }}
                disabled={busy}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                  selected ? `${t.bg} ${t.border}` : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'
                }`}
              >
                <div className={selected ? t.icon : 'text-white/40'}>{m.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${selected ? t.text : 'text-white/70'}`}>
                    {m.label}
                  </p>
                  <p className="text-[11px] text-white/40 mt-0.5">{m.subtitle}</p>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    selected ? `${t.border} bg-amber-500/30` : 'border-white/20'
                  }`}
                >
                  {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Currency */}
        <div className="mb-3">
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

        {/* Amount */}
        <div className="mb-3">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
            Amount ({currency})
          </label>
          <div className="flex items-center gap-2">
            {isAdjustment && (
              <button
                type="button"
                onClick={toggleSign}
                disabled={busy || !amount}
                title="Toggle add / deduct"
                className={`px-3 py-2.5 rounded-lg border text-lg font-black transition disabled:opacity-40 ${
                  isNegative
                    ? 'border-red-500/40 bg-red-500/10 text-red-300'
                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                }`}
              >
                {isNegative ? '−' : '+'}
              </button>
            )}
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              disabled={busy}
              placeholder="0.00"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-lg font-black tabular-nums text-white outline-none focus:border-amber-500/50"
            />
          </div>
          {method === 'paystack_checkout' && amount && (
            <p className="text-[11px] text-white/40 mt-1">
              You'll pay {currency} {Number(amount || 0).toLocaleString()} at checkout. Reference is generated automatically.
            </p>
          )}
          {isAdjustment && (
            <p className="text-[11px] text-white/40 mt-1">
              Use {isNegative ? '−' : '+'} to {isNegative ? 'deduct from' : 'add to'} the treasury. Reason required.
            </p>
          )}
        </div>

        {/* Reference — manual only */}
        {method === 'manual_record' && (
          <div className="mb-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
              Paystack Reference *
            </label>
            <input
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              disabled={busy}
              placeholder="e.g. 8892765 or TXN_xxx"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50 font-mono"
            />
            <p className="text-[11px] text-white/40 mt-1">
              The transaction ID from your Paystack dashboard for the received payment
            </p>
          </div>
        )}

        {/* Reason — adjustment only */}
        {method === 'adjustment' && (
          <div className="mb-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
              Reason *
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={busy}
              placeholder="e.g. Opening balance — September 2026"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            />
          </div>
        )}

        {/* Notes — manual only (adjustment uses description for reason) */}
        {method === 'manual_record' && (
          <div className="mb-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={busy}
              rows={2}
              placeholder="e.g. Weekly operational top-up"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 mb-3">
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 mb-3">
            <p className="text-xs text-emerald-300">{success}</p>
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={busy || !amount || amount === '0' || amount === '-0'}
          className={`w-full rounded-lg py-3 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition ${
            method === 'paystack_checkout'
              ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-black'
              : method === 'manual_record'
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-black'
              : isNegative
              ? 'bg-gradient-to-r from-red-500 to-red-400 text-white'
              : 'bg-white/10 text-white border border-white/20'
          }`}
        >
          {busy ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Working...
            </>
          ) : method === 'paystack_checkout' ? (
            'Continue to Paystack →'
          ) : method === 'manual_record' ? (
            'Verify & Record'
          ) : isNegative ? (
            'Apply Deduction'
          ) : (
            'Apply Adjustment'
          )}
        </button>
      </div>
    </div>
  );
}