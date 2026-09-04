'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/supabase';
import { 
  Zap, Send, RefreshCw, CheckCircle, AlertTriangle, 
  Trash2, X, Eye, History, Download
} from 'lucide-react';

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
  risk_level?: string;
  signal_notes: string;
  price: number;
  expires_at: string;
  status: string;
  created_at: string;
};

type SignalStats = {
  totalSignals: number;
  liveSignals: number;
  averageConfidence: number;
  hitRate: number;
  totalRevenue: number;
  signalsByRisk: {
    low: number;
    medium: number;
    high: number;
  };
};

export default function AviatorAdminPage() {
  // Existing states
  const [pattern, setPattern] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [dispatching, setDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [liveSignals, setLiveSignals] = useState<LiveSignal[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // NEW: Stats and Analytics
  const [stats, setStats] = useState<SignalStats>({
    totalSignals: 0,
    liveSignals: 0,
    averageConfidence: 0,
    hitRate: 0,
    totalRevenue: 0,
    signalsByRisk: { low: 0, medium: 0, high: 0 }
  });
  
  // NEW: Auto-dispatch settings
  const [autoDispatch, setAutoDispatch] = useState({
    enabled: false,
    interval: 15,
    maxSignals: 10,
  });
  
  // NEW: Signal history
  const [signalHistory, setSignalHistory] = useState<LiveSignal[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // NEW: Filter states
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const SAMPLE = '4.35x 5.06x 1.70x 1.10x 1.04x 3.09x 10.32x 6.74x 2.27x 1.58x 1.72x 5.31x 1.15x 3.15x 36.85x 5.98x 1.71x 1.05x 4.55x 1.23x 1.88x';

  // Load live signals and stats
  const loadLive = async () => {
    setLoadingLive(true);
    try {
      // Load live signals
      const { data: liveData } = await supabase
        .from('markets')
        .select('*')
        .eq('league_name', 'AVIATOR')
        .eq('is_live', true)
        .order('created_at', { ascending: false })
        .limit(20);
      setLiveSignals(liveData || []);

      // Load signal history
      const { data: historyData } = await supabase
        .from('markets')
        .select('*')
        .eq('league_name', 'AVIATOR')
        .order('created_at', { ascending: false })
        .limit(50);
      setSignalHistory(historyData || []);

      // Calculate stats
      if (historyData) {
        const total = historyData.length;
        const live = historyData.filter(s => s.is_live).length;
        const avgConf = historyData.reduce((acc, s) => acc + (s.confidence || 0), 0) / total || 0;
        const completed = historyData.filter(s => s.status === 'completed').length;
        const hitRate = total > 0 ? (completed / total) * 100 : 0;
        const revenue = historyData.reduce((acc, s) => acc + (s.price || 0), 0);

        const byRisk = {
          low: historyData.filter(s => s.risk_level === 'LOW').length,
          medium: historyData.filter(s => s.risk_level === 'MEDIUM').length,
          high: historyData.filter(s => s.risk_level === 'HIGH').length,
        };

        setStats({
          totalSignals: total,
          liveSignals: live,
          averageConfidence: avgConf,
          hitRate,
          totalRevenue: revenue,
          signalsByRisk: byRisk,
        });
      }
    } catch (e) {
      console.error('Error loading signals:', e);
    } finally {
      setLoadingLive(false);
    }
  };

  // Analyze pattern
  const analyze = async () => {
    if (!pattern.trim()) {
      setError('Paste round history numbers first');
      return;
    }
    setAnalyzing(true);
    setError('');
    setSignals([]);
    try {
      const res = await fetch('https://enterprise-backend-osh7.onrender.com/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern: pattern.trim() }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        setError(`Server returned non-JSON response (${res.status})`);
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
      setError('Error communicating with backend: ' + String(e));
    } finally {
      setAnalyzing(false);
    }
  };

  // Dispatch signals
  const dispatchSignals = useCallback(async () => {
    if (!signals.length) return;
    setDispatching(true);
    setError('');
    
    const TARGET_COUNT = 10;
    let finalSignals = [...signals];

    if (finalSignals.length < TARGET_COUNT) {
      let index = 0;
      while (finalSignals.length < TARGET_COUNT) {
        const baseSignal = signals[index % signals.length];
        const variance = (Math.random() * 0.15) - 0.05;
        const newExit = Math.max(1.10, +(baseSignal.exit_point + variance).toFixed(2));
        finalSignals.push({
          ...baseSignal,
          exit_point: newExit,
          confidence: Math.min(95, Math.max(60, baseSignal.confidence - Math.floor(Math.random() * 5)))
        });
        index++;
      }
    }

    if (finalSignals.length > 12) {
      finalSignals = finalSignals.slice(0, 12);
    }
    
    const exp = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    
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
      risk_level: s.risk_level || 'MEDIUM',
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
  }, [signals]);

  // Auto-dispatch timer
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (autoDispatch.enabled) {
      interval = setInterval(() => {
        if (signals.length > 0) {
          void dispatchSignals();
        }
      }, autoDispatch.interval * 60 * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoDispatch.enabled, autoDispatch.interval, dispatchSignals, signals]);

  // Expire a signal
  const expire = async (id: string) => {
    await supabase.from('markets')
      .update({ is_live: false, status: 'expired' })
      .eq('id', id);
    loadLive();
  };

  // NEW: Export signals
  const exportSignals = (format: 'csv' | 'json') => {
    const data = format === 'csv' 
      ? liveSignals.map(s => `${s.entry_point},${s.exit_point},${s.confidence},${s.signal_notes}`).join('\n')
      : JSON.stringify(liveSignals, null, 2);
    
    const blob = new Blob([data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aviator-signals.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // NEW: Toggle auto-dispatch
  const toggleAutoDispatch = () => {
    setAutoDispatch(prev => ({
      ...prev,
      enabled: !prev.enabled
    }));
  };

  // NEW: Clear all live signals
  const clearAllSignals = async () => {
    if (!confirm('Are you sure you want to clear all live signals?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const { data, error } = await supabase
        .from('markets')
        .update({
          is_live: false,
          status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .eq('league_name', 'AVIATOR')
        .eq('is_live', true)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        setError('No active Aviator signals found to clear.');
        return;
      }

      setSuccess('✅ All signals cleared successfully!');
      setTimeout(() => setSuccess(''), 3000);
      await loadLive();
    } catch (error) {
      console.error('Error clearing signals:', error);
      setError('Failed to clear signals');
    }
  };

  // Load on mount
  useEffect(() => {
    const syncLive = () => {
      void loadLive();
    };

    syncLive();
    const interval = setInterval(syncLive, 30000);
    return () => clearInterval(interval);
  }, []);

  const riskColor = (r: string) =>
    r === 'LOW' ? '#22c55e' : r === 'MEDIUM' ? '#fbbf24' : '#f87171';

  const filteredSignals = liveSignals.filter(s => {
    const matchRisk = filterRisk === 'all' || s.risk_level === filterRisk;
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchRisk && matchStatus;
  });

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <Zap size={24} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black">Aviator Signal Engine</h1>
              <p className="text-zinc-500 text-sm">Paste round history → Python processes → Dispatch</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadLive}
              disabled={loadingLive}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm transition"
            >
              <RefreshCw size={16} className={loadingLive ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm transition"
            >
              <History size={16} />
              History
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <p className="text-xs text-zinc-500">Total Signals</p>
            <p className="text-2xl font-black">{stats.totalSignals}</p>
            <p className="text-xs text-green-400">{stats.liveSignals} live</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <p className="text-xs text-zinc-500">Avg Confidence</p>
            <p className="text-2xl font-black text-yellow-400">{stats.averageConfidence.toFixed(1)}%</p>
            <div className="w-full h-1 bg-zinc-800 mt-1 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${stats.averageConfidence}%` }} />
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <p className="text-xs text-zinc-500">Hit Rate</p>
            <p className="text-2xl font-black text-green-400">{stats.hitRate.toFixed(1)}%</p>
            <p className="text-xs text-zinc-500">Success rate</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <p className="text-xs text-zinc-500">Revenue</p>
            <p className="text-2xl font-black text-blue-400">${stats.totalRevenue.toFixed(0)}</p>
            <p className="text-xs text-zinc-500">From signal sales</p>
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
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6 flex items-center gap-3 animate-pulse">
            <CheckCircle size={16} className="text-green-400" />
            <p className="text-green-400 text-sm font-bold">{success}</p>
            <button onClick={() => setSuccess('')}><X size={14} className="text-zinc-500" /></button>
          </div>
        )}

        {dispatched && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6 flex items-center gap-3 animate-pulse">
            <CheckCircle size={16} className="text-green-400" />
            <p className="text-green-400 text-sm font-bold">✅ Signals dispatched! Active for 20 minutes.</p>
          </div>
        )}

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
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setPattern(SAMPLE)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                → Use sample data to test
              </button>
            </div>
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

          {/* Live Signals Block */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Live Signals ({filteredSignals.length})
              </p>
              <div className="flex gap-2">
                <select
                  value={filterRisk}
                  onChange={(e) => setFilterRisk(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg text-xs px-2 py-1 text-zinc-400"
                >
                  <option value="all">All Risk</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg text-xs px-2 py-1 text-zinc-400"
                >
                  <option value="all">All Status</option>
                  <option value="live">Live</option>
                  <option value="expired">Expired</option>
                </select>
                <button
                  onClick={clearAllSignals}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 bg-red-500/10 rounded-lg"
                >
                  Clear All
                </button>
              </div>
            </div>

            {filteredSignals.length === 0 ? (
              <div className="text-center py-8">
                <Eye size={28} className="text-zinc-700 mx-auto mb-2" />
                <p className="text-zinc-600 text-xs">No live signals</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredSignals.map(s => (
                  <div key={s.id}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between hover:bg-zinc-900 transition">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-green-400 font-black font-mono text-sm">{s.entry_point}x</span>
                        <span className="text-zinc-600">→</span>
                        <span className="text-red-400 font-black font-mono text-sm">{s.exit_point}x</span>
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{s.confidence}%</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full`}
                          style={{ background: `${riskColor(s.risk_level || 'MEDIUM')}20`, color: riskColor(s.risk_level || 'MEDIUM') }}>
                          {s.risk_level || 'MEDIUM'}
                        </span>
                      </div>
                      <p className="text-zinc-600 text-xs mt-1">
                        Exp: {new Date(s.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => expire(s.id)}
                        className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-lg hover:bg-red-500/20 transition"
                      >
                        Expire
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Auto-Dispatch Controls */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleAutoDispatch}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition ${
                    autoDispatch.enabled
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {autoDispatch.enabled ? '🟢 Auto-Dispatch ON' : '⏸️ Auto-Dispatch OFF'}
                </button>
              </div>
              {autoDispatch.enabled && (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <span>Interval: {autoDispatch.interval} min</span>
                  <span className="text-zinc-600">|</span>
                  <span>Max: {autoDispatch.maxSignals} signals</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => exportSignals('csv')}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
              >
                <Download size={14} /> CSV
              </button>
              <button
                onClick={() => exportSignals('json')}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
              >
                <Download size={14} /> JSON
              </button>
            </div>
          </div>
        </div>

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
                      <label className="text-[10px] text-zinc-600 uppercase font-bold block mb-1">Entry</label>
                      <input type="number" step="0.01" value={s.entry_point}
                        onChange={e => setSignals(p => p.map((sig, idx) => 
                          idx === i ? { ...sig, entry_point: parseFloat(e.target.value) || 1.20 } : sig
                        ))}
                        className="w-full bg-green-500/10 border border-green-500/30 text-green-400 font-mono font-black text-lg p-2 rounded-lg text-center outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-600 uppercase font-bold block mb-1">Exit</label>
                      <input type="number" step="0.01" value={s.exit_point}
                        onChange={e => setSignals(p => p.map((sig, idx) => 
                          idx === i ? { ...sig, exit_point: parseFloat(e.target.value) || 2.00 } : sig
                        ))}
                        className="w-full bg-red-500/10 border border-red-500/30 text-red-400 font-mono font-black text-lg p-2 rounded-lg text-center outline-none" />
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between mb-1">
                      <label className="text-[10px] text-zinc-600 uppercase font-bold">Confidence</label>
                      <span className="text-yellow-400 text-xs font-black">{s.confidence}%</span>
                    </div>
                    <input type="range" min="50" max="95" value={s.confidence}
                      onChange={e => setSignals(p => p.map((sig, idx) => 
                        idx === i ? { ...sig, confidence: parseInt(e.target.value) } : sig
                      ))}
                      className="w-full accent-yellow-400" />
                  </div>

                  <div className="flex gap-2 mb-3">
                    {[3, 5, 10].map(price => (
                      <button key={price} type="button"
                        onClick={() => setSignals(prev => prev.map((sig, idx) => 
                          idx === i ? { ...sig, suggested_price: price } : sig
                        ))}
                        className={`flex-1 py-2 rounded-lg font-black text-sm border transition-all ${
                          s.suggested_price === price
                            ? 'border-green-500 bg-green-500/20 text-green-400'
                            : 'border-zinc-700 bg-zinc-900 text-zinc-500'
                        }`}>
                        ${price}
                      </button>
                    ))}
                  </div>

                  <p className="text-zinc-600 text-xs italic">{s.signal_notes}</p>
                </div>
              ))}
            </div>

            <button type="button" onClick={dispatchSignals} disabled={dispatching}
              className={`w-full py-5 rounded-xl font-black text-base uppercase tracking-wider flex items-center justify-center gap-3 transition-all ${
                dispatching
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-400 text-white'
              }`}>
              {dispatching ? (
                <><RefreshCw size={20} className="animate-spin" /> Dispatching...</>
              ) : (
                <><Send size={20} /> Dispatch Batch to App</>
              )}
            </button>
          </div>
        )}

        {/* Signal History Modal */}
        {showHistory && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Signal History</h3>
                <button onClick={() => setShowHistory(false)} className="text-zinc-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-800/30">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-zinc-400">Entry</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-zinc-400">Exit</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-zinc-400">Confidence</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-zinc-400">Risk</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-zinc-400">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-zinc-400">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {signalHistory.slice(0, 20).map((s) => (
                      <tr key={s.id} className="hover:bg-zinc-800/30 transition">
                        <td className="px-4 py-2 text-sm font-mono text-green-400">{s.entry_point}x</td>
                        <td className="px-4 py-2 text-sm font-mono text-red-400">{s.exit_point}x</td>
                        <td className="px-4 py-2 text-sm text-yellow-400">{s.confidence}%</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full`}
                            style={{ 
                              background: `${riskColor(s.risk_level || 'MEDIUM')}20`, 
                              color: riskColor(s.risk_level || 'MEDIUM') 
                            }}>
                            {s.risk_level || 'MEDIUM'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`text-xs font-bold ${
                            s.status === 'live' ? 'text-green-400' :
                            s.status === 'completed' ? 'text-blue-400' :
                            'text-zinc-500'
                          }`}>
                            {s.status || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-zinc-500">
                          {new Date(s.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}