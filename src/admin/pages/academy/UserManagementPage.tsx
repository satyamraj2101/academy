import { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, MoreVertical, Trash2, Shield, User, GraduationCap, Building2 } from 'lucide-react';
import { academyAPI } from '../../../academy/api';

interface AcademyUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: number;
  created_at: string;
  partner_status: string;
  credit_balance: number;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<AcademyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await academyAPI.adminUsers.list() as any;
      if (res.success) {
        setUsers(res.users);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleUpdateRole = async (id: string, newRole: string) => {
    try {
      await academyAPI.adminUsers.update(id, { role: newRole });
      setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
    } catch (e) {
      alert('Failed to update role');
    }
    setActionUserId(null);
  };

  const handleToggleActive = async (id: string, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    try {
      await academyAPI.adminUsers.update(id, { is_active: newStatus === 1 });
      setUsers(users.map(u => u.id === id ? { ...u, is_active: newStatus } : u));
    } catch (e) {
      alert('Failed to update status');
    }
    setActionUserId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this user?')) return;
    try {
      await academyAPI.adminUsers.delete(id);
      setUsers(users.filter(u => u.id !== id));
    } catch (e: any) {
      alert(e.message || 'Failed to delete user');
    }
    setActionUserId(null);
  };

  const filtered = users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    if (role === 'admin') return <Shield className="w-3.5 h-3.5 text-rose-500" />;
    if (role === 'teacher') return <User className="w-3.5 h-3.5 text-indigo-500" />;
    if (role === 'university') return <Building2 className="w-3.5 h-3.5 text-amber-500" />;
    return <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />;
  };

  const getRoleBadgeColor = (role: string) => {
    if (role === 'admin') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (role === 'teacher') return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    if (role === 'university') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            User Management
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage students, teachers, universities, and administrators.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-64 transition-all shadow-sm"
            />
          </div>
          <button onClick={loadUsers} className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-widest font-black text-slate-500">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                      Loading users...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">No users found.</td>
                </tr>
              ) : (
                filtered.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold shadow-sm">
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">{user.full_name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getRoleBadgeColor(user.role || 'student')}`}>
                        {getRoleIcon(user.role || 'student')}
                        {user.role || 'student'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.is_active === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {user.is_active === 1 ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button 
                        onClick={() => setActionUserId(actionUserId === user.id ? null : user.id)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {actionUserId === user.id && (
                        <div className="absolute right-8 top-12 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-10 animate-in fade-in slide-in-from-top-2 origin-top-right">
                          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Change Role</div>
                          <button onClick={() => handleUpdateRole(user.id, 'student')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 font-medium">Make Student</button>
                          <button onClick={() => handleUpdateRole(user.id, 'teacher')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 font-medium">Make Teacher</button>
                          <button onClick={() => handleUpdateRole(user.id, 'university')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 font-medium">Make University</button>
                          <button onClick={() => handleUpdateRole(user.id, 'admin')} className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 font-medium">Make Admin</button>
                          <div className="h-px bg-slate-100 my-1.5" />
                          <button onClick={() => handleToggleActive(user.id, user.is_active)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium">
                            {user.is_active === 1 ? 'Suspend User' : 'Reactivate User'}
                          </button>
                          <button onClick={() => handleDelete(user.id)} className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium">
                            <Trash2 className="w-3.5 h-3.5" /> Delete User
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
