import { useState } from 'react';
import { KeyRound, Plus, X, Copy, Trash2, Check } from 'lucide-react';
import { useD1Query } from '../hooks/useD1Query';
import { DataTable } from '../components/DataTable';
import { toast } from '../../lib/toast';

interface ServiceKey extends Record<string, unknown> {
  id: string;
  label: string;
  permissions: string;
  created_by: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export default function ServiceKeysPage() {
  const { data, loading, error, mutate, refetch } = useD1Query<{ keys: ServiceKey[] }>('/service-keys');
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const keys = data?.keys || [];

  const handleCreate = async () => {
    if (!label.trim()) {
      toast.error('Enter a label for this key');
      return;
    }
    setCreating(true);
    try {
      const res = await mutate('POST', { label: label.trim(), permissions: ['academy'] }) as { key: string };
      setNewKey(res.key);
      setLabel('');
      setShowForm(false);
      await refetch();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      await mutate('DELETE', undefined, `?id=${id}`);
      toast.success('Key revoked');
      await refetch();
    } catch (e: any) {
      toast.error(e.message || 'Failed to revoke key');
    } finally {
      setRevokingId(null);
    }
  };

  const copyKey = () => {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-indigo-600" />
            Service API Keys
          </h1>
          <p className="text-sm text-slate-500 mt-1">Non-interactive credentials for tools like the MCP server — superadmin only.</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 h-10 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:shadow transition-all"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Create Key'}
        </button>
      </div>

      {newKey && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <p className="text-sm font-bold text-emerald-800 mb-2">Key created — copy it now, it won't be shown again:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-800 overflow-x-auto">{newKey}</code>
            <button onClick={copyKey} className="p-2.5 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shrink-0">
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-700" />}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-xs font-bold text-emerald-700 hover:text-emerald-900 mt-3">Dismiss</button>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Label</label>
          <div className="flex gap-3">
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Claude MCP Server"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {error ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-red-500 shadow-sm font-medium">
          Error loading keys: {error}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
          <DataTable<ServiceKey>
            columns={[
              { key: 'label', label: 'Label', render: k => <span className="font-bold text-slate-900 text-sm">{k.label}</span> },
              { key: 'created_by', label: 'Created By', hideOnMobile: true },
              { key: 'last_used_at', label: 'Last Used', hideOnMobile: true, render: k => <span>{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}</span> },
              {
                key: 'revoked_at', label: 'Status', render: k => (
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    k.revoked_at ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  }`}>
                    {k.revoked_at ? 'Revoked' : 'Active'}
                  </span>
                )
              },
              {
                key: 'actions', label: '', className: 'text-right', render: k => (
                  !k.revoked_at ? (
                    <button
                      onClick={() => handleRevoke(k.id)}
                      disabled={revokingId === k.id}
                      className="flex items-center gap-1.5 ml-auto text-rose-600 hover:text-rose-700 text-sm font-bold transition-colors bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Revoke
                    </button>
                  ) : null
                )
              },
            ]}
            data={keys}
            loading={loading}
            emptyMessage="No service API keys created yet."
          />
        </div>
      )}
    </div>
  );
}
