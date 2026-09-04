'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  Settings,
  Save,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Globe,
  Users,
  DollarSign,
  Shield,
  Bell,
  Palette,
  Mail,
  Lock,
  Database,
  Server,
  Smartphone,
  Zap
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
  enable_registration: boolean;
  email_verification: boolean;
  two_factor_auth: boolean;
  session_timeout: number;
  max_login_attempts: number;
};

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  
  const [settings, setSettings] = useState<AdminSettings>({
    site_name: 'Global Hub',
    site_url: 'https://globalhub.com',
    support_email: 'support@globalhub.com',
    max_users: 1000,
    maintenance_mode: false,
    default_currency: 'USD',
    timezone: 'UTC',
    theme: 'dark',
    enable_registration: true,
    email_verification: true,
    two_factor_auth: false,
    session_timeout: 60,
    max_login_attempts: 5,
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      // Try to get settings from database
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
        // If table doesn't exist, use defaults
        if (error.code === '42P01') {
          setMessage('Settings table not found. Using defaults.');
          setMessageType('error');
        }
        return;
      }

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
      // Try to update or insert settings
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) {
        // If table doesn't exist, create it
        if (error.code === '42P01') {
          // Create the table
          await createSettingsTable();
          // Try again
          const { error: retryError } = await supabase
            .from('admin_settings')
            .upsert({
              ...settings,
              updated_at: new Date().toISOString()
            });
          
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }

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
      console.error('Save error:', error);
      setMessage('❌ Error: ' + (error.message || 'Failed to save settings'));
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const createSettingsTable = async () => {
    // This would create the table if it doesn't exist
    // In production, this should be done via migrations
    console.log('Creating settings table...');
    // The actual table creation should be done in Supabase
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-white/40">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">⚙️ Admin Settings</h1>
          <p className="text-sm text-white/40">Configure global system settings</p>
        </div>
        <button
          onClick={loadSettings}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition"
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

      <div className="bg-white/5 rounded-2xl border border-white/5 p-6">
        <form onSubmit={saveSettings} className="space-y-6">
          {/* General Settings */}
          <div>
            <h3 className="text-sm font-bold text-white/40 mb-4 flex items-center gap-2">
              <Globe size={16} className="text-blue-400" />
              General Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Site Name</label>
                <input
                  type="text"
                  value={settings.site_name}
                  onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Site URL</label>
                <input
                  type="url"
                  value={settings.site_url}
                  onChange={(e) => setSettings({ ...settings, site_url: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Support Email</label>
                <input
                  type="email"
                  value={settings.support_email}
                  onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Default Currency</label>
                <select
                  value={settings.default_currency}
                  onChange={(e) => setSettings({ ...settings, default_currency: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="KES">KES (KSh)</option>
                  <option value="NGN">NGN (₦)</option>
                </select>
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="pt-4 border-t border-white/5">
            <h3 className="text-sm font-bold text-white/40 mb-4 flex items-center gap-2">
              <Server size={16} className="text-green-400" />
              System Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Max Users</label>
                <input
                  type="number"
                  value={settings.max_users}
                  onChange={(e) => setSettings({ ...settings, max_users: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Timezone</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">EST (GMT-5)</option>
                  <option value="Europe/London">GMT</option>
                  <option value="Africa/Nairobi">EAT (GMT+3)</option>
                  <option value="Asia/Dubai">GST (GMT+4)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Theme</label>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System Default</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Session Timeout (minutes)</label>
                <input
                  type="number"
                  value={settings.session_timeout}
                  onChange={(e) => setSettings({ ...settings, session_timeout: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  min="5"
                />
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="pt-4 border-t border-white/5">
            <h3 className="text-sm font-bold text-white/40 mb-4 flex items-center gap-2">
              <Shield size={16} className="text-purple-400" />
              Security Settings
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.enable_registration}
                  onChange={(e) => setSettings({ ...settings, enable_registration: e.target.checked })}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-purple-500 focus:ring-purple-500"
                />
                <label className="text-sm text-white/60">Enable User Registration</label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.email_verification}
                  onChange={(e) => setSettings({ ...settings, email_verification: e.target.checked })}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-purple-500 focus:ring-purple-500"
                />
                <label className="text-sm text-white/60">Require Email Verification</label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.two_factor_auth}
                  onChange={(e) => setSettings({ ...settings, two_factor_auth: e.target.checked })}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-purple-500 focus:ring-purple-500"
                />
                <label className="text-sm text-white/60">Enable Two-Factor Authentication</label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.maintenance_mode}
                  onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-purple-500 focus:ring-purple-500"
                />
                <label className="text-sm text-white/60">Maintenance Mode</label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 rounded-xl text-white font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}