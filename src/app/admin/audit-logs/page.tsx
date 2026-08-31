'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { formatDateTime } from '@/lib/utils';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setLogs(data || []);
      setLoading(false);
    };
    loadLogs();
  }, []);

  if (loading) {
    return <div className="text-white/40">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
      <div className="glass-card p-4">
        {logs.length === 0 ? (
          <p className="text-white/40">No audit logs found</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-white">{log.action}</p>
                    <p className="text-sm text-white/40">{log.target}</p>
                  </div>
                  <span className="text-xs text-white/30">{formatDateTime(log.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}