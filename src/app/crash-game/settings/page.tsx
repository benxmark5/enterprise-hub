'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { RefreshCw, Loader2, ArrowLeft, Settings, Save, X, AlertCircle, CheckCircle } from 'lucide-react';

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
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('game_settings')
        .select('*');

      if (data) {
        const settingsObj: any = {};
        data.forEach((s: any) => {
          settingsObj[s.setting_key] = s.setting_value;
        });
        setSettings({
          min_bet: settingsObj.min_bet?.amount || 1,
          max_bet: settingsObj.max_bet?.amount || 1000,
          round_duration: settingsObj.round_duration?.seconds || 30,
          auto_cashout_limit: settingsObj.auto_cashout_limit?.max_multiplier || 10,
          house_edge: settingsObj.house_edge?.percentage || 5,
          max_players: settingsObj.max_players?.count || 1000,
          round_interval: settingsObj.round_interval?.seconds || 5,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
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
        { setting_key: 'min_bet', setting_value: { amount: settings.min_bet } },
        { setting_key: 'max_bet', setting_value: { amount: settings.max_bet } },
        { setting_key: 'round_duration', setting_value: { seconds: settings.round_duration } },
        { setting_key: 'auto_cashout_limit', setting_value: { max_multiplier: settings.auto_cashout_limit } },
        { setting_key: 'house_edge', setting_value: { percentage: settings.house_edge } },
        { setting_key: 'max_players', setting_value: { count: settings.max_players } },
        { setting_key: 'round_interval', setting_value: { seconds: settings.round_interval } },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('game_settings')
          .upsert(update);

        if (error) throw error;
      }

      setMessage('✅ Settings saved successfully!');
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/crash-game">
          <button className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition">
            <ArrowLeft size={20} />
          </button>
        </Link>
        <h1 className="text-2xl font-bold text-yellow-400">⚙️ Settings</h1>
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

      <div className="glass-card p-6">
        <form onSubmit={saveSettings} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-white/60 mb-2">Min Bet ($)</label>
              <input
                type="number"
                value={settings.min_bet}
                onChange={(e) => setSettings({ ...settings, min_bet: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                step="0.01"
                min="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-2">Max Bet ($)</label>
              <input
                type="number"
                value={settings.max_bet}
                onChange={(e) => setSettings({ ...settings, max_bet: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                step="0.01"
                min="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-2">Round Duration (seconds)</label>
              <input
                type="number"
                value={settings.round_duration}
                onChange={(e) => setSettings({ ...settings, round_duration: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                min="5"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-2">Auto Cashout Max (x)</label>
              <input
                type="number"
                value={settings.auto_cashout_limit}
                onChange={(e) => setSettings({ ...settings, auto_cashout_limit: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                step="0.1"
                min="1.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-2">House Edge (%)</label>
              <input
                type="number"
                value={settings.house_edge}
                onChange={(e) => setSettings({ ...settings, house_edge: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                step="0.1"
                min="0"
                max="100"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-2">Max Players</label>
              <input
                type="number"
                value={settings.max_players}
                onChange={(e) => setSettings({ ...settings, max_players: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-2">Round Interval (seconds)</label>
              <input
                type="number"
                value={settings.round_interval}
                onChange={(e) => setSettings({ ...settings, round_interval: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                min="1"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-400 hover:to-yellow-400 text-black font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}