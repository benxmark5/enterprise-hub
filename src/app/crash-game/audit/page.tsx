'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { RefreshCw, Loader2, ArrowLeft, Shield, Search } from 'lucide-react';

export default function CrashGameAudit() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const loadLogs = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      setLogs(data || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.target?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/crash-game">
          <button className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition">
            <ArrowLeft size={20} />
          </button>
        </Link>
        <h1 className="text-2xl font-bold text-purple-400">📋 Audit Log</h1>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-white/40" size={16} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search audit logs..."
          className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500"
        />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-white/40">
              <Loader2 className="animate-spin inline mr-2" size={16} />
              Loading...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-white/40">No audit logs found</div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-white/5 transition">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white/5 rounded-lg">
                    <Shield size={16} className="text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-bold text-white">{log.action}</p>
                      <p className="text-xs text-white/30">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm text-white/40">Target: {log.target || 'N/A'}</p>
                    {log.previous_value && log.new_value && (
                      <div className="mt-2 p-2 bg-white/5 rounded-lg text-xs font-mono">
                        <div className="text-red-400">Previous: {JSON.stringify(log.previous_value)}</div>
                        <div className="text-green-400">New: {JSON.stringify(log.new_value)}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}