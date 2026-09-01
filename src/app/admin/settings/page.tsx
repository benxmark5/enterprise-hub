'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/supabase';
import { 
  ArrowLeft, RefreshCw, Loader2, Settings, 
  Globe, Users, DollarSign, Shield, Bell,
  Palette, Mail, Lock, Database, Server,
  CheckCircle, AlertCircle, X, Save
} from 'lucide-react';

type AdminSettings = {
  site_name: string;
  site_url: string;
  support_email: string;
  max_users: number;
  maintenance_mode: boolean;
  default_currency: string;
  timezone: string;
  theme: string;
};

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  
  const [settings, setSettings] = useState<AdminSettings>({
    site_name: 'Enterprise Hub',
    site_url: 'https://enterprise-hub.com',
    support_email: 'support@enterprise-hub.com',
    max_users: 1000,
    maintenance_mode: false,
    default_currency: 'USD',
    timezone: 'UTC',
    theme: 'dark',
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('admin_settings')
        .select('*')
        .maybeSingle();

      if (data) {
        setSettings(data);
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
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setMessage('✅ Settings saved successfully!');
      setMessageType('success');
      
      await supabase.from('audit_logs').insert({
        action: 'UPDATE_ADMIN_SETTINGS',
        target: 'admin_settings',
        new_value: settings,
        created_at: new Date().toISOString()
      });

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
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <Link href="/admin">
            <button className="p-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition">
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white">⚙️ Admin Settings</h1>
            <p className="text-zinc-500 text-sm">Configure global system settings</p>
          </div>
          <button
            onClick={loadSettings}
            disabled={loading}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-bold transition"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
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

        {/* Settings Form */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <form onSubmit={saveSettings} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* General Settings */}
              <div className="md:col-span-2">
                <h3 className="text-sm font-bold text-zinc-400 mb-4 flex items-center gap-2">
                  <Settings size={16} className="text-blue-400" />
                  General Settings
                </h3>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Site Name</label>
                <input
                  type="text"
                  value={settings.site_name}
                  onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Site URL</label>
                <input
                  type="url"
                  value={settings.site_url}
                  onChange={(e) => setSettings({ ...settings, site_url: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Support Email</label>
                <input
                  type="email"
                  value={settings.support_email}
                  onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Default Currency</label>
                <select
                  value={settings.default_currency}
                  onChange={(e) => setSettings({ ...settings, default_currency: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="KES">KES (KSh)</option>
                  <option value="NGN">NGN (₦)</option>
                </select>
              </div>

              {/* System Settings */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-sm font-bold text-zinc-400 mb-4 flex items-center gap-2">
                  <Server size={16} className="text-green-400" />
                  System Settings
                </h3>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Max Users</label>
                <input
                  type="number"
                  value={settings.max_users}
                  onChange={(e) => setSettings({ ...settings, max_users: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Timezone</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">EST (GMT-5)</option>
                  <option value="Europe/London">GMT</option>
                  <option value="Africa/Nairobi">EAT (GMT+3)</option>
                  <option value="Asia/Dubai">GST (GMT+4)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Theme</label>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System Default</option>
                </select>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.maintenance_mode}
                    onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ms-3 text-sm font-medium text-zinc-400">
                    Maintenance Mode
                  </span>
                </label>
                <p className="text-xs text-zinc-500">When enabled, only admins can access the site</p>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-zinc-800">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}