'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDateTime } from '@/lib/utils';
import type { AuditLog } from '@/types';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
      setLogs(data as AuditLog[] || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gh-text-primary">Audit Logs</h1>
      <div className="gh-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gh-bg-tertiary border-b border-gh-border">
            <tr>
              <th className="text-left px-4 py-3 text-gh-text-muted font-medium">Admin</th>
              <th className="text-left px-4 py-3 text-gh-text-muted font-medium">Action</th>
              <th className="text-left px-4 py-3 text-gh-text-muted font-medium">Target</th>
              <th className="text-left px-4 py-3 text-gh-text-muted font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-b border-gh-border/50 hover:bg-gh-bg-tertiary/50">
                <td className="px-4 py-3 text-gh-text-primary">{log.admin_email}</td>
                <td className="px-4 py-3 text-gh-text-secondary">{log.action}</td>
                <td className="px-4 py-3 text-gh-text-secondary">{log.target_table}:{log.target_id}</td>
                <td className="px-4 py-3 text-gh-text-muted">{formatDateTime(log.created_at)}</td>
              </tr>
            ))}
            {logs.length === 0 && !loading && <tr><td colSpan={4} className="px-4 py-8 text-center text-gh-text-muted">No audit logs found.</td></tr>}
            {loading && <tr><td colSpan={4} className="px-4 py-8 text-center text-gh-text-muted">Loading logs...</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
