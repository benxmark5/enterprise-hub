// src/app/admin/treasury/components/TreasuryLedgerTable.tsx
'use client';

import { ArrowUpRight, ArrowDownRight, Inbox } from 'lucide-react';
import { formatMoney, relativeTime, TX_LABELS, toneClasses } from '@/lib/treasury/format';

export type LedgerRow = {
  id: string;
  type: string;
  amount: number;
  currency: string;
  direction: 'in' | 'out';
  reference: string | null;
  related_withdrawal_id: string | null;
  description: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
};

export default function TreasuryLedgerTable({
  rows,
  loading,
}: {
  rows: LedgerRow[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-amber-400" />
        <p className="mt-3 text-sm text-white/40">Loading ledger...</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <Inbox size={32} className="text-white/20 mx-auto mb-3" />
        <p className="text-sm text-white/50 font-semibold">No treasury movements yet</p>
        <p className="text-xs text-white/30 mt-1">Fund the treasury to see entries here</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/[0.04]">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Type</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Description</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Reference</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white/40">Amount</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">By</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map(row => {
              const meta = TX_LABELS[row.type] ?? { label: row.type, tone: 'neutral' as const };
              const tone = toneClasses(meta.tone);
              const isIn = row.direction === 'in';
              return (
                <tr key={row.id} className="hover:bg-white/[0.03] transition">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${tone.bg} ${tone.border} ${tone.text}`}>
                      {isIn ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/70 max-w-[240px] truncate">
                    {row.description || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-white/40 truncate max-w-[180px]">
                    {row.reference || '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold tabular-nums ${isIn ? 'text-emerald-300' : 'text-red-300'}`}>
                    {isIn ? '+' : '−'} {formatMoney(row.amount, row.currency)}
                  </td>
                  <td className="px-4 py-3 text-xs text-white/40">
                    {row.created_by || 'system'}
                  </td>
                  <td className="px-4 py-3 text-xs text-white/40 whitespace-nowrap">
                    {relativeTime(row.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}