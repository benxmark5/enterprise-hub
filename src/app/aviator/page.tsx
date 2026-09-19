// src/app/aviator/page.tsx
'use client';

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { supabase } from '@/app/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  Zap, Send, RefreshCw, CheckCircle, AlertTriangle,
  Trash2, Eye, EyeOff, History, Sparkles, Pause, Play,
  Settings, ChevronDown, BarChart3,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
type EngineSignal = {
  entry_point: number;
  exit_point: number;
  confidence: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  signal_notes: string;
  suggested_price: number;
};

type Batch = {
  id: string;
  name: string | null;
  sample_size: number;
  median_crash: number | null;
  mu: number | null;
  sigma: number | null;
  volatility: string | null;
  trend: string | null;
  min_confidence: number | null;
  signal_count: number | null;
  price_usd: number | null;
  status: 'draft' | 'published' | 'expired' | 'archived';
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
};

type SignalRow = {
  id: string;
  batch_id: string;
  entry_point: number;
  exit_point: number;
  confidence: number;
  risk_level: string;
  signal_notes: string | null;
  suggested_price: number | null;
  round_number: number | null;
  result_status: 'pending' | 'won' | 'lost' | 'void';
  position: number;
};

const SAMPLE = '4.35x 5.06x 1.70x 1.10x 1.04x 3.09x 10.32x 6.74x 2.27x 1.58x 1.72x 5.31x 1.15x 3.15x 36.85x 5.98x 1.71x 1.05x 4.55x 1.23x 1.88x 2.10x 3.40x 2.90x 1.30x 4.20x 1.50x 2.60x 1.90x 3.10x';

const RISK_COLORS: Record<string, string> = {
  LOW: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  MEDIUM: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  HIGH: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
  published: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  expired: 'bg-red-500/15 text-red-300 border-red-500/30',
  archived: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

// ─────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────
export default function AviatorAdminPage(): ReactElement {
  const { user } = useAuth();

  const [pattern, setPattern] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [pullingFromGame, setPullingFromGame] = useState(false);
  const [signals, setSignals] = useState<EngineSignal[]>([]);
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [signalCount, setSignalCount] = useState(5);
  const [minConfidence, setMinConfidence] = useState(60);
  const [packPrice, setPackPrice] = useState('10.00');
  const [packName, setPackName] = useState('');

  const [autoDispatch, setAutoDispatch] = useState({
    enabled: false,
    intervalMin: 15,
    paused: false,
  });

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [busyBatchId, setBusyBatchId] = useState<string | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [batchSignals, setBatchSignals] = useState<Record<string, SignalRow[]>>({});

  // ── Load batches ──
  const loadBatches = useCallback(async () => {
    setLoadingBatches(true);
    try {
      const { data } = await supabase
        .from('aviator_batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      setBatches((data ?? []) as Batch[]);
    } catch { /* silent */ } finally {
      setLoadingBatches(false);
    }
  }, []);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  // ── Analyze pasted pattern ──
  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError('');
    setSuccess('');
    setSignals([]);
    setMetadata(null);
    try {
      const res = await fetch('/aviator/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern,
          count: signalCount,
          minConfidence,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Engine failed');
      } else {
        setSignals(data.signals as EngineSignal[]);
        setMetadata(data.metadata ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Pull from live game and analyze ──
  const handlePullFromGame = async () => {
    setPullingFromGame(true);
    setError('');
    setSuccess('');
    setSignals([]);
    setMetadata(null);
    try {
      const res = await fetch('/aviator/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'auto',
          sampleSize: 50,
          count: signalCount,
          minConfidence,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Engine failed');
      } else {
        setSignals(data.signals as EngineSignal[]);
        setMetadata(data.metadata ?? null);
        const sampleSize = String((data.metadata as { sample_size?: number })?.sample_size ?? 50);
        setPattern(`(auto-pulled ${sampleSize} rounds from live game)`);
        setSuccess(`Pulled ${sampleSize} rounds from live game and generated signals.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setPullingFromGame(false);
    }
  };

  // ── Create batch from current signals ──
  const handleCreateBatch = async (publishNow: boolean) => {
    if (!user || signals.length === 0) return;
    const priceNum = Number(packPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError('Enter a valid price');
      return;
    }

    setError('');
    setSuccess('');
    try {
      const batchName = packName.trim() || `Pack of ${signals.length} · ${new Date().toLocaleString()}`;
      const meta = (metadata ?? {}) as Record<string, unknown>;

      const { data: batchRow, error: batchErr } = await supabase
        .from('aviator_batches')
        .insert({
          name: batchName,
          sample_size: Number(meta.sample_size ?? 0),
          median_crash: meta.median_crash != null ? Number(meta.median_crash) : null,
          mu: meta.mu != null ? Number(meta.mu) : null,
          sigma: meta.sigma != null ? Number(meta.sigma) : null,
          volatility: meta.volatility ?? null,
          trend: meta.trend ?? null,
          min_confidence: minConfidence,
          signal_count: signals.length,
          price_usd: priceNum,
          status: publishNow ? 'published' : 'draft',
          published_at: publishNow ? new Date().toISOString() : null,
          expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
          created_by: user.id,
        })
        .select()
        .single();

      if (batchErr || !batchRow) throw batchErr ?? new Error('Batch insert failed');

      const signalRows = signals.map((s, i) => ({
        batch_id: batchRow.id,
        entry_point: s.entry_point,
        exit_point: s.exit_point,
        confidence: s.confidence,
        risk_level: s.risk_level,
        signal_notes: s.signal_notes,
        suggested_price: s.suggested_price,
        position: i,
        result_status: 'pending' as const,
      }));

      const { error: sigErr } = await supabase.from('aviator_signals').insert(signalRows);
      if (sigErr) throw sigErr;

      setSuccess(`Batch created${publishNow ? ' and published' : ''} successfully.`);
      setSignals([]);
      setMetadata(null);
      setPattern('');
      setPackName('');
      await loadBatches();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create batch failed');
    }
  };

  // ── Change batch status ──
  const changeBatchStatus = async (b: Batch, newStatus: 'draft' | 'published' | 'expired' | 'archived') => {
    setBusyBatchId(b.id);
    setError('');
    try {
      const patch: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === 'published' && !b.published_at) {
        patch.published_at = new Date().toISOString();
      }
      const { error: err } = await supabase.from('aviator_batches').update(patch).eq('id', b.id);
      if (err) throw err;
      setSuccess(`Batch ${newStatus}.`);
      await loadBatches();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyBatchId(null);
    }
  };

  // ── Delete batch ──
  const deleteBatch = async (b: Batch) => {
    if (!confirm(`Delete batch "${b.name}"? This cannot be undone.`)) return;
    setBusyBatchId(b.id);
    setError('');
    try {
      const { error: err } = await supabase.from('aviator_batches').delete().eq('id', b.id);
      if (err) throw err;
      setSuccess('Batch deleted.');
      await loadBatches();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusyBatchId(null);
    }
  };

  // ── Expand batch ──
  const toggleBatchSignals = async (batchId: string) => {
    if (expandedBatch === batchId) { setExpandedBatch(null); return; }
    setExpandedBatch(batchId);
    if (batchSignals[batchId]) return;
    try {
      const { data } = await supabase
        .from('aviator_signals')
        .select('*')
        .eq('batch_id', batchId)
        .order('position');
      setBatchSignals(prev => ({ ...prev, [batchId]: (data ?? []) as SignalRow[] }));
    } catch { /* silent */ }
  };

  // ── Mark signal result ──
  const markSignalResult = async (signalId: string, batchId: string, newResult: 'pending' | 'won' | 'lost' | 'void') => {
    try {
      const { error: err } = await supabase
        .from('aviator_signals')
        .update({
          result_status: newResult,
          result_updated_at: new Date().toISOString(),
          result_updated_by: user?.id ?? null,
        })
        .eq('id', signalId);
      if (err) throw err;
      setBatchSignals(prev => ({
        ...prev,
        [batchId]: prev[batchId].map(s => s.id === signalId ? { ...s, result_status: newResult } : s),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const stats = {
    totalBatches: batches.length,
    publishedBatches: batches.filter(b => b.status === 'published').length,
    totalSignals: batches.reduce((s, b) => s + (b.signal_count ?? 0), 0),
    revenue: batches.reduce((s, b) => s + (b.price_usd ?? 0), 0),
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap size={22} className="text-emerald-400" /> Aviator Signal Engine
          </h1>
          <p className="text-sm text-white/40">
            Pull live rounds or paste history → Engine generates signals → Publish as a batch.
          </p>
        </div>
        <button
          type="button"
          onClick={loadBatches}
          disabled={loadingBatches}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition disabled:opacity-50"
        >
          <RefreshCw size={16} className={loadingBatches ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Batches" value={stats.totalBatches} />
        <StatCard label="Published" value={stats.publishedBatches} color="text-emerald-400" />
        <StatCard label="Total Signals" value={stats.totalSignals} color="text-blue-400" />
        <StatCard label="Total Value" value={`$${stats.revenue.toFixed(2)}`} color="text-amber-400" />
      </div>

      {/* Banners */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300 flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300" type="button">×</button>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <CheckCircle size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-300 flex-1">{success}</p>
          <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-300" type="button">×</button>
        </div>
      )}

      {/* Two-column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT */}
        <div className="glass-card p-5 space-y-3">
          <h3 className="text-white font-bold flex items-center gap-2 mb-2">
            <BarChart3 size={16} className="text-emerald-400" /> Step 1 — Get Round History
          </h3>
          <p className="text-white/40 text-xs">
            Pull the last 50 rounds automatically, or paste your own. Space-separated.
          </p>

          <div className="flex items-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={handlePullFromGame}
              disabled={pullingFromGame}
              className="text-sm text-blue-300 hover:text-blue-200 flex items-center gap-1.5 disabled:opacity-50 font-bold bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-3 py-2 rounded-lg transition"
            >
              {pullingFromGame ? (
                <><RefreshCw size={13} className="animate-spin" /> Pulling...</>
              ) : (
                <><Zap size={13} /> Pull last 50 rounds from live game</>
              )}
            </button>
            <button
              type="button"
              onClick={() => setPattern(SAMPLE)}
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              → Use sample data
            </button>
          </div>

          <textarea
            value={pattern}
            onChange={e => setPattern(e.target.value)}
            placeholder="Paste multipliers here, or click the button above to auto-fill..."
            rows={6}
            className="form-input"
            style={{ fontFamily: 'monospace', resize: 'vertical' }}
          />

          {/* Controls */}
          <div className="border-t border-white/10 pt-3 mt-3">
            <h4 className="text-white font-bold flex items-center gap-2 mb-3 text-sm">
              <Settings size={14} className="text-emerald-400" /> Step 2 — Engine Controls
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Signals per Batch">
                <input
                  type="number"
                  min="2"
                  max="8"
                  value={signalCount}
                  onChange={e => setSignalCount(Math.max(2, Math.min(8, Number(e.target.value))))}
                  className="form-input"
                />
              </Field>
              <Field label="Min Confidence (%)">
                <input
                  type="number"
                  min="40"
                  max="95"
                  value={minConfidence}
                  onChange={e => setMinConfidence(Math.max(40, Math.min(95, Number(e.target.value))))}
                  className="form-input"
                />
              </Field>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing || !pattern.trim() || pattern.startsWith('(auto-pulled')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black rounded-xl text-sm font-black transition disabled:opacity-50"
          >
            {analyzing ? <><RefreshCw size={16} className="animate-spin" /> Analyzing...</> : <><Sparkles size={16} /> Generate Signals</>}
          </button>

          {/* Auto-dispatch */}
          <div className="border-t border-white/10 pt-3 mt-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white font-bold flex items-center gap-2 text-sm">
                <Pause size={14} className="text-amber-400" /> Auto-dispatch
              </h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoDispatch.enabled}
                  onChange={e => setAutoDispatch(p => ({ ...p, enabled: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span className="text-xs text-white/60">Enabled</span>
              </label>
            </div>
            {autoDispatch.enabled && (
              <div className="flex gap-2">
                <Field label="Every (min)">
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={autoDispatch.intervalMin}
                    onChange={e => setAutoDispatch(p => ({ ...p, intervalMin: Number(e.target.value) }))}
                    className="form-input"
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => setAutoDispatch(p => ({ ...p, paused: !p.paused }))}
                  className={`flex items-end gap-1 px-3 py-2 rounded-lg text-xs font-bold transition ${
                    autoDispatch.paused
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {autoDispatch.paused ? <><Play size={12} /> Resume</> : <><Pause size={12} /> Pause</>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="glass-card p-5 space-y-3">
          <h3 className="text-white font-bold flex items-center gap-2 mb-2">
            <Eye size={16} className="text-emerald-400" /> Step 3 — Preview & Publish
          </h3>

          {signals.length === 0 ? (
            <div className="text-center py-12">
              <Zap size={36} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">No signals yet</p>
              <p className="text-white/30 text-xs mt-1">Pull rounds or paste history and click Generate</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {signals.map((s, i) => (
                  <div
                    key={i}
                    className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-start justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/40 mb-1">Signal {i + 1}</p>
                      <p className="text-white font-black text-lg font-mono">
                        Exit at <span className="text-emerald-400">{s.exit_point}x</span>
                      </p>
                      <p className="text-white/50 text-xs mt-1 line-clamp-2">{s.signal_notes}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${RISK_COLORS[s.risk_level]}`}>
                        {s.risk_level}
                      </span>
                      <p className="text-white/80 text-sm font-bold mt-1">{s.confidence}%</p>
                      <p className="text-emerald-400 text-xs font-bold mt-0.5">${s.suggested_price}</p>
                    </div>
                  </div>
                ))}
              </div>

              {metadata && (
                <div className="text-[10px] text-white/30 font-mono space-y-0.5 pt-2 border-t border-white/10">
                  <p>sample: {String(metadata.sample_size)} rounds</p>
                  <p>median: {String(metadata.median_crash)}x · mu: {String(metadata.mu)} · sigma: {String(metadata.sigma)}</p>
                  <p>volatility: {String(metadata.volatility)} · trend: {String(metadata.trend)}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Field label="Pack Name (optional)">
                  <input
                    type="text"
                    value={packName}
                    onChange={e => setPackName(e.target.value)}
                    placeholder="e.g. Morning Pack"
                    className="form-input"
                  />
                </Field>
                <Field label="Price (USD)">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={packPrice}
                    onChange={e => setPackPrice(e.target.value)}
                    className="form-input"
                  />
                </Field>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCreateBatch(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateBatch(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-black transition"
                >
                  <Send size={14} /> Publish Now
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Batch list */}
      <div className="glass-card p-5">
        <h3 className="text-white font-bold flex items-center gap-2 mb-4">
          <History size={16} className="text-emerald-400" /> Recent Batches
        </h3>

        {loadingBatches && batches.length === 0 ? (
          <div className="text-center py-6 text-white/30 text-sm">Loading...</div>
        ) : batches.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-white/40 text-sm">No batches yet</p>
            <p className="text-white/30 text-xs mt-1">Generate signals and click Publish</p>
          </div>
        ) : (
          <div className="space-y-2">
            {batches.map(b => {
              const expanded = expandedBatch === b.id;
              const sigs = batchSignals[b.id] ?? [];
              return (
                <div key={b.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  <div className="flex items-start justify-between gap-3 p-3">
                    <button
                      type="button"
                      onClick={() => toggleBatchSignals(b.id)}
                      className="flex-1 flex items-center gap-3 text-left min-w-0"
                    >
                      <ChevronDown
                        size={14}
                        className={`text-white/40 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-bold text-sm truncate">{b.name || 'Unnamed Batch'}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${STATUS_COLORS[b.status]}`}>
                            {b.status}
                          </span>
                          {b.volatility && (
                            <span className="text-[10px] text-white/40 font-mono">σ {b.sigma} · {b.volatility}</span>
                          )}
                        </div>
                        <p className="text-white/40 text-xs mt-1">
                          {b.signal_count} signals · ${b.price_usd?.toFixed(2)} · {new Date(b.created_at).toLocaleString()}
                        </p>
                      </div>
                    </button>
                    <div className="flex gap-1 flex-wrap justify-end shrink-0">
                      {b.status === 'draft' && (
                        <button
                          onClick={() => changeBatchStatus(b, 'published')}
                          disabled={busyBatchId === b.id}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition disabled:opacity-50"
                          type="button"
                        >
                          <Eye size={10} /> Publish
                        </button>
                      )}
                      {b.status === 'published' && (
                        <button
                          onClick={() => changeBatchStatus(b, 'expired')}
                          disabled={busyBatchId === b.id}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition disabled:opacity-50"
                          type="button"
                        >
                          <EyeOff size={10} /> Expire
                        </button>
                      )}
                      {b.status !== 'archived' && (
                        <button
                          onClick={() => changeBatchStatus(b, 'archived')}
                          disabled={busyBatchId === b.id}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-zinc-500/15 text-zinc-300 border border-zinc-500/30 hover:bg-zinc-500/25 transition disabled:opacity-50"
                          type="button"
                        >
                          Archive
                        </button>
                      )}
                      <button
                        onClick={() => deleteBatch(b)}
                        disabled={busyBatchId === b.id}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 transition disabled:opacity-50"
                        type="button"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-white/10 bg-black/20 p-3 space-y-2">
                      {sigs.length === 0 ? (
                        <p className="text-white/30 text-xs text-center py-2">Loading signals...</p>
                      ) : (
                        sigs.map(s => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between gap-2 text-xs bg-white/5 rounded-lg p-2"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-white/40">#{s.position + 1}</span>{' '}
                              <span className="text-white font-mono">exit {s.exit_point}x</span>{' '}
                              <span className="text-white/40">· {s.confidence}% ·</span>{' '}
                              <span className={`px-1.5 py-0.5 rounded text-[10px] border ${RISK_COLORS[s.risk_level]}`}>{s.risk_level}</span>
                            </div>
                            <div className="flex gap-1">
                              {(['won','lost','void','pending'] as const).map(r => (
                                <button
                                  key={r}
                                  onClick={() => markSignalResult(s.id, b.id, r)}
                                  disabled={s.result_status === r}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition disabled:opacity-60 ${
                                    s.result_status === r
                                      ? r === 'won' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                        : r === 'lost' ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                        : r === 'void' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                        : 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
                                      : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
                                  }`}
                                  type="button"
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-white/60 font-bold uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function StatCard({ label, value, color = 'text-white' }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
      <p className="text-xs text-white/40 uppercase tracking-wider font-bold mb-1">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}