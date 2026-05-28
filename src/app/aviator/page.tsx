"use client";
import { useState } from 'react';
import { supabase } from '@/app/supabase';
import { Zap, Send, RefreshCw, CheckCircle, AlertTriangle, Trash2, X, Eye } from 'lucide-react';

type Signal = {
  entry_point: number;
  exit_point: number;
  confidence: number;
  risk_level: string;
  signal_notes: string;
  suggested_price: number;
};

type LiveSignal = {
  id: string;
  entry_point: number;
  exit_point: number;
  confidence: number;
  signal_notes: string;
  price: number;
  expires_at: string;
};

export default function AviatorAdminPage() {
  const [pattern, setPattern] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [dispatching, setDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [liveSignals, setLiveSignals] = useState<LiveSignal[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const [error, setError] = useState('');

  const SAMPLE = '4.35x 5.06x 1.70x 1.10x 1.04x 3.09x 10.32x 6.74x 2.27x 1.58x 1.72x 5.31x 1.15x 3.15x 36.85x 5.98x 1.71x 1.05x 4.55x 1.23x 1.88x';

  const analyze = async () => {
    if (!pattern.trim()) {
      setError('Paste round history numbers first');
      return;
    }
    setAnalyzing(true);
    setError('');
    setSignals([]);
    try {
      // 🟢 Update your fetch line to hit your new sub-folder route exactly:
        const res = await fetch('https://enterprise-backend-osh7.onrender.com/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern: pattern.trim() }),
      });

      // Handle HTML fallbacks (like 404/500 errors) gracefully before attempting to parse JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        setError(`Server returned non-JSON response (${res.status}). Verify your Next.js local server window log entries.`);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Analysis failed');
        return;
      }
      setSignals(data.signals || []);
      setDispatched(false);
    } catch (e) {
      setError('Error communicating with backend API router: ' + String(e));
    } finally {
      setAnalyzing(false);
    }
  };

  const update = (i: number, k: keyof Signal, v: string | number) => {
    setSignals(p => p.map((s, idx) => idx === i ? { ...s, [k]: v } : s));
  };

  const dispatch = async () => {
    if (!signals.length) return;
    setDispatching(true);
    setError('');
    
    // 1. Determine our batch target size (Aim for exactly 10 signals)
    const TARGET_COUNT = 10;
    let finalSignals = [...signals];

    // 2. Loop & fill: If Python generated fewer than 10, duplicate up to our target size
    if (finalSignals.length < TARGET_COUNT) {
      let index = 0;
      while (finalSignals.length < TARGET_COUNT) {
        // Clone an existing signal cleanly
        const baseSignal = signals[index % signals.length];
        
        // Add a tiny random variance to the exit points so they aren't identical copies
        const variance = (Math.random() * 0.15) - 0.05; // variance between -0.05x and +0.10x
        const newExit = Math.max(1.10, +(baseSignal.exit_point + variance).toFixed(2));
        
        finalSignals.push({
          ...baseSignal,
          exit_point: newExit,
          // Shift confidence slightly for variation
          confidence: Math.min(95, Math.max(60, baseSignal.confidence - Math.floor(Math.random() * 5)))
        });
        index++;
      }
    }

    // 3. Cap guardrail: Ensure we NEVER exceed 12 signals under any circumstance
    if (finalSignals.length > 12) {
      finalSignals = finalSignals.slice(0, 12);
    }
    
    // 4. Expiry creation setup
    const exp = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    
    // 5. Map the collection to your database rows layout
    const rows = finalSignals.map(s => ({
      name: 'AVIATOR - Signal',
      league_name: 'AVIATOR',
      market_type: 'aviator',
      entry_point: +s.entry_point,
      exit_point: +s.exit_point,
      confidence: +s.confidence,
      signal_notes: s.signal_notes,
      price: +s.suggested_price || 5,
      daily_price: +s.suggested_price || 5,
      odds: +s.exit_point,
      is_live: true,
      status: 'live',
      home_team: 'AVIATOR',
      away_team: 'SIGNAL',
      expires_at: exp,
    }));
    
    const { error: e } = await supabase.from('markets').insert(rows);
    if (e) {
      setError('Dispatch failed: ' + e.message);
    } else {
      setDispatched(true);
      setSignals([]);
      setPattern('');
      loadLive();
    }
    setDispatching(false);
  };

  const loadLive = async () => {
    setLoadingLive(true);
    const { data } = await supabase
      .from('markets')
      .select('*')
      .eq('league_name', 'AVIATOR')
      .eq('is_live', true)
      .order('created_at', { ascending: false })
      .limit(12);
    setLiveSignals(data || []);
    setLoadingLive(false);
  };

  const expire = async (id: string) => {
    await supabase.from('markets')
      .update({ is_live: false, status: 'expired' })
      .eq('id', id);
    loadLive();
  };

  const riskColor = (r: string) =>
    r === 'LOW' ? '#22c55e' : r === 'MEDIUM' ? '#fbbf24' : '#f87171';

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <Zap size={24} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Aviator Signal Engine</h1>
            <p className="text-zinc-500 text-sm">Paste round history → Python processes → Dispatch</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Input Block */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
              Step 1 — Paste Round History Numbers
            </p>
            <p className="text-zinc-400 text-xs mb-3 leading-relaxed">
              Open Aviator → Round History → Copy the multipliers → Paste below:
            </p>
            <textarea
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              placeholder={`Paste numbers here e.g:\n${SAMPLE}`}
              rows={6}
              className="w-full bg-zinc-950 border border-zinc-700 text-white p-4 rounded-xl text-sm resize-none placeholder:text-zinc-600 outline-none focus:border-red-500/50 font-mono mb-3"
            />
            <button
              type="button"
              onClick={() => setPattern(SAMPLE)}
              className="text-xs text-zinc-500 hover:text-zinc-300 mb-4 block"
            >
              → Use sample data to test
            </button>
            <button
              type="button"
              onClick={analyze}
              disabled={analyzing || !pattern.trim()}
              className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                analyzing || !pattern.trim()
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-400 text-white'
              }`}
            >
              {analyzing ? (
                <><RefreshCw size={16} className="animate-spin" /> Analyzing...</>
              ) : (
                <><Zap size={16} /> Generate Signals</>
              )}
            </button>
          </div>

          {/* Live Component Block */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Live Signals</p>
              <button type="button" onClick={loadLive} className="text-zinc-500 hover:text-white">
                <RefreshCw size={14} className={loadingLive ? 'animate-spin' : ''} />
              </button>
            </div>
            {liveSignals.length === 0 ? (
              <div className="text-center py-8">
                <Eye size={28} className="text-zinc-700 mx-auto mb-2" />
                <p className="text-zinc-600 text-xs mb-3">No live signals</p>
                <button type="button" onClick={loadLive}
                  className="text-xs border border-zinc-700 text-zinc-500 hover:text-white px-4 py-2 rounded-lg">
                  Load
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {liveSignals.map(s => (
                  <div key={s.id}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 font-black font-mono text-sm">{s.entry_point}x</span>
                        <span className="text-zinc-600">→</span>
                        <span className="text-red-400 font-black font-mono text-sm">{s.exit_point}x</span>
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{s.confidence}%</span>
                      </div>
                      <p className="text-zinc-600 text-xs mt-0.5">
                        Exp: {new Date(s.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button type="button" onClick={() => expire(s.id)}
                      className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-lg">
                      Expire
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle size={16} className="text-red-400" />
            <p className="text-red-400 text-sm flex-1">{error}</p>
            <button onClick={() => setError('')}><X size={14} className="text-zinc-500" /></button>
          </div>
        )}

        {/* Success Notification */}
        {dispatched && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle size={16} className="text-green-400" />
            <p className="text-green-400 text-sm font-bold">✅ Signals dispatched! Active for 20 minutes.</p>
          </div>
        )}

        {/* Review Signals Section */}
        {signals.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-5">
              Step 2 — Review {signals.length} Signals
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {signals.map((s, i) => (
                <div key={i} className="bg-zinc-950 border rounded-xl p-4"
                  style={{ borderColor: `${riskColor(s.risk_level || 'LOW')}30` }}>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black uppercase px-3 py-1 rounded-full"
                      style={{ color: riskColor(s.risk_level || 'LOW'), background: `${riskColor(s.risk_level || 'LOW')}20` }}>
                      {s.risk_level || 'LOW'} RISK
                    </span>
                    <button type="button"
                      onClick={() => setSignals(p => p.filter((_, idx) => idx !== i))}
                      className="text-zinc-600 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] text-zinc-600 uppercase font-bold block mb-1">🟢 Entry</label>
                      <input type="number" step="0.01" value={s.entry_point}
                        onChange={e => update(i, 'entry_point', parseFloat(e.target.value) || 1.20)}
                        className="w-full bg-green-500/10 border border-green-500/30 text-green-400 font-mono font-black text-lg p-2 rounded-lg text-center outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-600 uppercase font-bold block mb-1">🔴 Exit</label>
                      <input type="number" step="0.01" value={s.exit_point}
                        onChange={e => update(i, 'exit_point', parseFloat(e.target.value) || 2.00)}
                        className="w-full bg-red-500/10 border border-red-500/30 text-red-400 font-mono font-black text-lg p-2 rounded-lg text-center outline-none" />
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between mb-1">
                      <label className="text-[10px] text-zinc-600 uppercase font-bold">Confidence</label>
                      <span className="text-yellow-400 text-xs font-black">{s.confidence}%</span>
                    </div>
                    <input type="range" min="50" max="95" value={s.confidence}
                      onChange={e => update(i, 'confidence', parseInt(e.target.value))}
                      className="w-full accent-yellow-400" />
                  </div>

                  <div className="flex gap-2 mb-3">
                    {[3, 5, 10].map(p => (
                      <button key={p} type="button"
                        onClick={() => update(i, 'suggested_price', p)}
                        className={`flex-1 py-2 rounded-lg font-black text-sm border transition-all ${
                          s.suggested_price === p
                            ? 'border-green-500 bg-green-500/20 text-green-400'
                            : 'border-zinc-700 bg-zinc-900 text-zinc-500'
                        }`}>
                        ${p}
                      </button>
                    ))}
                  </div>

                  <p className="text-zinc-600 text-xs italic">{s.signal_notes}</p>
                </div>
              ))}
            </div>

            <button type="button" onClick={dispatch} disabled={dispatching}
              className={`w-full py-5 rounded-xl font-black text-base uppercase tracking-wider flex items-center justify-center gap-3 transition-all ${
                dispatching
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-400 text-white'
              }`}>
              {dispatching ? (
                <><RefreshCw size={20} className="animate-spin" /> Dispatching...</>
              ) : (
                <><Send size={20} /> Dispatch Batch to App (Sends 10 Signals)</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}