'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { RefreshCw, Loader2, ArrowLeft, Save, X, AlertCircle, CheckCircle, ShieldAlert, PlayCircle, Zap, DollarSign } from 'lucide-react';

export default function CrashGameSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  
  const [settings, setSettings] = useState({
    min_bet: 1,
    max_bet: 1000,
    round_duration: 30,
    auto_cashout_limit: 10,
    house_edge: 5,
    max_players: 1000,
    round_interval: 5,
    game_status: 'active',
    max_payout_per_bet: 10000,
    crash_algorithm: 'provably_fair',
    forced_crash_multiplier: 0,
    enable_chat: true,
    enable_live_bets: true,
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('game_settings')
        .select('*');

      if (error) throw error;

      if (data) {
        const settingsObj: Record<string, any> = {};
        data.forEach((s: any) => {
          settingsObj[s.setting_key] = s.setting_value;
        });

        setSettings({
          min_bet: settingsObj.min_bet?.amount ?? 1,
          max_bet: settingsObj.max_bet?.amount ?? 1000,
          round_duration: settingsObj.round_duration?.seconds ?? 30,
          auto_cashout_limit: settingsObj.auto_cashout_limit?.max_multiplier ?? 10,
          house_edge: settingsObj.house_edge?.percentage ?? 5,
          max_players: settingsObj.max_players?.count ?? 1000,
          round_interval: settingsObj.round_interval?.seconds ?? 5,
          game_status: settingsObj.game_status?.status ?? 'active',
          max_payout_per_bet: settingsObj.max_payout_per_bet?.amount ?? 10000,
          crash_algorithm: settingsObj.crash_algorithm?.type ?? 'provably_fair',
          forced_crash_multiplier: settingsObj.forced_crash_multiplier?.multiplier ?? 0,
          enable_chat: settingsObj.enable_chat?.enabled ?? true,
          enable_live_bets: settingsObj.enable_live_bets?.enabled ?? true,
        });
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      setMessage('❌ Failed to load settings: ' + (error.message || 'Check database table'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setMessageType('');

    try {
      const updates = [
        { key: 'min_bet', val: { amount: Number(settings.min_bet) } },
        { key: 'max_bet', val: { amount: Number(settings.max_bet) } },
        { key: 'round_duration', val: { seconds: Number(settings.round_duration) } },
        { key: 'auto_cashout_limit', val: { max_multiplier: Number(settings.auto_cashout_limit) } },
        { key: 'house_edge', val: { percentage: Number(settings.house_edge) } },
        { key: 'max_players', val: { count: Number(settings.max_players) } },
        { key: 'round_interval', val: { seconds: Number(settings.round_interval) } },
        { key: 'game_status', val: { status: settings.game_status } },
        { key: 'max_payout_per_bet', val: { amount: Number(settings.max_payout_per_bet) } },
        { key: 'crash_algorithm', val: { type: settings.crash_algorithm } },
        { key: 'forced_crash_multiplier', val: { multiplier: Number(settings.forced_crash_multiplier) } },
        { key: 'enable_chat', val: { enabled: Boolean(settings.enable_chat) } },
        { key: 'enable_live_bets', val: { enabled: Boolean(settings.enable_live_bets) } },
      ];

      for (const item of updates) {
        const { error } = await supabase
          .from('game_settings')
          .update({ setting_value: item.val })
          .eq('setting_key', item.key);

        if (error) throw error;
      }

      setMessage('✅ Advanced Crash settings updated successfully!');
      setMessageType('success');
      setTimeout(() => setMessage(''), 4000);
    } catch (error: any) {
      setMessage('❌ Error: ' + error.message);
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <span className="ml-3 text-white/40">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/crash-game">
          <button className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition">
            <ArrowLeft size={20} />
          </button>
        </Link>
        <h1 className="text-2xl font-bold text-yellow-400">⚙️ Aviator / Crash Engine Settings</h1>
        <button
          onClick={loadSettings}
          disabled={loading}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          messageType === 'success' 
            ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {messageType === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <p className="flex-1">{message}</p>
          <button onClick={() => setMessage('')} className="hover:text-white">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="glass-card p-6 bg-white/5 rounded-2xl border border-white/10">
        <form onSubmit={saveSettings} className="space-y-8">
          
          {/* Operational Control Panel */}
          <div>
            <h3 className="text-sm font-bold text-orange-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <PlayCircle size={16} /> Live Control & Risk Management
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm text-white/60 mb-2">Game Server State</label>
                <select
                  value={settings.game_status}
                  onChange={(e) => setSettings({ ...settings, game_status: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="active" className="bg-black">Active (Running)</option>
                  <option value="paused" className="bg-black">Paused (Finish Current Round)</option>
                  <option value="maintenance" className="bg-black">Maintenance Mode</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Crash Algorithm</label>
                <select
                  value={settings.crash_algorithm}
                  onChange={(e) => setSettings({ ...settings, crash_algorithm: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="provably_fair" className="bg-black">Provably Fair (Standard)</option>
                  <option value="dynamic" className="bg-black">Dynamic Pool Balanced</option>
                  <option value="fixed" className="bg-black">Fixed Odds</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2 flex items-center gap-1 text-red-400">
                  <ShieldAlert size={14} /> Forced Crash Override (0 = Off)
                </label>
                <input
                  type="number"
                  value={settings.forced_crash_multiplier ?? 0}
                  onChange={(e) => setSettings({ ...settings, forced_crash_multiplier: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-white focus:outline-none focus:border-red-500"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Core Wager Limits */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-sm font-bold text-yellow-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <DollarSign size={16} /> Financial & Bet Limits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm text-white/60 mb-2">Min Bet ($)</label>
                <input
                  type="number"
                  value={settings.min_bet ?? 1}
                  onChange={(e) => setSettings({ ...settings, min_bet: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Max Bet ($)</label>
                <input
                  type="number"
                  value={settings.max_bet ?? 1000}
                  onChange={(e) => setSettings({ ...settings, max_bet: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Max Payout Per Bet ($)</label>
                <input
                  type="number"
                  value={settings.max_payout_per_bet ?? 10000}
                  onChange={(e) => setSettings({ ...settings, max_payout_per_bet: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  step="1"
                  min="100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">House Edge (%)</label>
                <input
                  type="number"
                  value={settings.house_edge ?? 5}
                  onChange={(e) => setSettings({ ...settings, house_edge: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                />
              </div>
            </div>
          </div>

          {/* Timing & Performance Constraints */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-sm font-bold text-blue-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Zap size={16} /> Timing & Server Constraints
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm text-white/60 mb-2">Round Duration (sec)</label>
                <input
                  type="number"
                  value={settings.round_duration ?? 30}
                  onChange={(e) => setSettings({ ...settings, round_duration: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  min="5"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Round Interval / Cooldown (sec)</label>
                <input
                  type="number"
                  value={settings.round_interval ?? 5}
                  onChange={(e) => setSettings({ ...settings, round_interval: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Auto Cashout Max Limit (x)</label>
                <input
                  type="number"
                  value={settings.auto_cashout_limit ?? 10}
                  onChange={(e) => setSettings({ ...settings, auto_cashout_limit: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  step="any"
                  min="1.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Max Simultaneous Players</label>
                <input
                  type="number"
                  value={settings.max_players ?? 1000}
                  onChange={(e) => setSettings({ ...settings, max_players: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  min="1"
                  required
                />
              </div>
            </div>
          </div>

          {/* Social & Feature Toggles */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-sm font-bold text-green-400 mb-4 uppercase tracking-wider">UI & Social Features</h3>
            <div className="flex flex-wrap gap-8">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.enable_chat)}
                  onChange={(e) => setSettings({ ...settings, enable_chat: e.target.checked })}
                  className="w-5 h-5 rounded border-white/10 bg-white/5 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-white">Enable In-Game Live Chat</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.enable_live_bets)}
                  onChange={(e) => setSettings({ ...settings, enable_live_bets: e.target.checked })}
                  className="w-5 h-5 rounded border-white/10 bg-white/5 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-white">Enable Live Bets Sidebar (Other Users)</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-400 hover:to-yellow-400 text-black font-extrabold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 text-base shadow-lg shadow-orange-500/20"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {saving ? 'Saving Engine Settings...' : 'Save All Crash Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}