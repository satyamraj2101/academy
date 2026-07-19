import { useEffect } from 'react';
import { Shield } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { useD1Query } from '../hooks/useD1Query';

export default function AuditLogPage() {
  const { data, loading, refetch } = useD1Query<{ logs: Array<{ id: string; admin_email: string; action: string; target_type: string; target_id: string; details: string; ip_hash: string; created_at: string }> }>('/audit');

  useEffect(() => { refetch(); }, [refetch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Audit Log</h1>
          <p className="text-sm text-slate-400 mt-0.5">Immutable record of admin actions</p>
        </div>
      </div>

      <div className="premium-glass-card rounded-card border-surface-800 p-5">
        <DataTable
          loading={loading}
          data={(data?.logs as unknown as Record<string, unknown>[]) || []}
          searchable
          searchKeys={['admin_email', 'action', 'target_type'] as never[]}
          columns={[
            { key: 'created_at', label: 'Date', render: row => <span className="text-xs text-slate-400">{new Date(String(row.created_at)).toLocaleString()}</span> },
            { key: 'admin_email', label: 'Admin', render: row => <span className="text-xs font-semibold text-slate-300">{String(row.admin_email)}</span> },
            { key: 'action', label: 'Action', render: row => (
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                String(row.action).includes('delete') ? 'bg-rose-500/10 text-rose-400'
                : String(row.action).includes('update') || String(row.action).includes('patch') ? 'bg-amber-500/10 text-amber-400'
                : 'bg-indigo-500/10 text-indigo-400'
              }`}>{String(row.action)}</span>
            )},
            { key: 'target_type', label: 'Target', render: row => <span className="text-xs text-slate-400">{String(row.target_type)}: {String(row.target_id)}</span> },
            { key: 'ip_hash', label: 'IP Hash', className: 'hidden md:table-cell', render: row => <span className="text-[10px] font-mono text-slate-500">{String(row.ip_hash).slice(0, 12)}...</span> },
          ]}
          emptyMessage="No audit logs recorded yet."
        />
      </div>
    </div>
  );
}
