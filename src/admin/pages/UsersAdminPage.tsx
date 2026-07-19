import { useEffect, useState } from 'react';
import { Users, Plus, X } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { useD1Query, adminFetch } from '../hooks/useD1Query';
import { RoleGate } from '../components/PermissionGate';

interface AdminUser { id: string; email: string; name: string; role: string; permissions: string; last_login: string; is_active: number; }

const ALL_PERMISSIONS = ['chat', 'submissions', 'users', 'tracking', 'email_reply', 'export', 'settings'];

export default function UsersAdminPage() {
  const { data, loading, refetch } = useD1Query<{ users: AdminUser[] }>('/users');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', role: 'viewer', permissions: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { refetch(); }, [refetch]);

  const handleAdd = async () => {
    setSaving(true); setError('');
    try {
      await adminFetch('/users', { method: 'POST', body: JSON.stringify(form) });
      setShowAdd(false);
      setForm({ email: '', name: '', role: 'viewer', permissions: [] });
      refetch();
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (user: AdminUser) => {
    await adminFetch(`/users?id=${user.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: user.is_active ? 0 : 1 }) });
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Admin Users</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage admin access and permissions</p>
        </div>
        <RoleGate roles={['superadmin']}>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center justify-center gap-2 h-10 bg-indigo-600 rounded-control shadow-raised hover:-translate-y-0.5 transition-all text-white text-sm font-semibold px-4"
          >
            <Plus className="w-4 h-4" /> Add Admin
          </button>
        </RoleGate>
      </div>

      {showAdd && (
        <div className="premium-glass-card rounded-card border-surface-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white">Add Admin User</h2>
            <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Email</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/60" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/60" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none">
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-2">Permissions</label>
            <div className="flex flex-wrap gap-2">
              {ALL_PERMISSIONS.map(p => (
                <button
                  key={p}
                  onClick={() => setForm(f => ({ ...f, permissions: f.permissions.includes(p) ? f.permissions.filter(x => x !== p) : [...f.permissions, p] }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    form.permissions.includes(p) ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                  }`}
                >{p.replace('_', ' ')}</button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button onClick={handleAdd} disabled={saving} className="h-10 bg-indigo-600 rounded-control shadow-raised hover:-translate-y-0.5 transition-all text-white text-sm font-semibold px-4 disabled:opacity-50">
            {saving ? 'Adding...' : 'Add User'}
          </button>
        </div>
      )}

      <DataTable
        loading={loading}
        data={(data?.users as unknown as Record<string, unknown>[]) || []}
        searchable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email', className: 'hidden sm:table-cell' },
          { key: 'role', label: 'Role', render: row => (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${
              row.role === 'superadmin' ? 'bg-violet-500/10 text-violet-400'
              : row.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400'
              : 'bg-slate-700/60 text-slate-400'
            }`}>{String(row.role)}</span>
          )},
          { key: 'last_login', label: 'Last Login', className: 'hidden md:table-cell', render: row => (
            <span className="text-xs text-slate-400">{row.last_login ? new Date(String(row.last_login)).toLocaleDateString() : 'Never'}</span>
          )},
          { key: 'is_active', label: 'Status', render: row => (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              row.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}>{row.is_active ? 'Active' : 'Suspended'}</span>
          )},
        ]}
        emptyMessage="No admin users yet. Add the first admin above."
      />
    </div>
  );
}
