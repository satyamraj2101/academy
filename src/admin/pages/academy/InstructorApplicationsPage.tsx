import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { useD1Query } from '../../hooks/useD1Query';
import { DataTable } from '../../components/DataTable';
import { toast } from '../../../lib/toast';

interface Application extends Record<string, unknown> {
  id: string;
  full_name: string;
  email: string;
  instructor_status: string;
  instructor_applied_at: string;
  instructor_bio: string | null;
  course_count?: number;
  total_enrollments?: number;
}

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
] as const;

export default function InstructorApplicationsPage() {
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const { data, loading, error, mutate, refetch } = useD1Query<{ applications: Application[] }>(`/academy/instructor-applications?status=${tab}`);
  const [actingId, setActingId] = useState<string | null>(null);

  const applications = data?.applications || [];

  const act = async (userId: string, action: 'approve' | 'reject' | 'revoke') => {
    setActingId(userId);
    try {
      await mutate('POST', { user_id: userId, action });
      toast.success(`Application ${action}d`);
      await refetch();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update application');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-indigo-600" />
          Instructor Applications
        </h1>
        <p className="text-sm text-slate-500 mt-1">Approve students who want to create and teach their own courses.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${tab === t.value ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-red-500 shadow-sm font-medium">
          Error loading applications: {error}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
          <DataTable<Application>
            columns={[
              { key: 'full_name', label: 'Name', render: a => <p className="font-bold text-slate-900 text-sm">{a.full_name}</p> },
              { key: 'email', label: 'Email' },
              { key: 'instructor_bio', label: 'Bio', render: a => <span className="text-xs text-slate-500 line-clamp-2 max-w-xs block">{a.instructor_bio || '—'}</span> },
              ...(tab === 'approved' ? [
                { key: 'course_count', label: 'Courses', hideOnMobile: true, render: (a: Application) => <span className="font-bold text-slate-700">{a.course_count ?? 0}</span> },
                { key: 'total_enrollments', label: 'Students', hideOnMobile: true, render: (a: Application) => <span className="font-bold text-slate-700">{a.total_enrollments ?? 0}</span> },
              ] : []),
              { key: 'instructor_applied_at', label: 'Applied', hideOnMobile: true, render: a => <span>{a.instructor_applied_at ? new Date(a.instructor_applied_at).toLocaleDateString() : '—'}</span> },
              {
                key: 'actions', label: '', className: 'text-right', render: a => (
                  <div className="flex items-center justify-end gap-2">
                    {tab === 'pending' && (
                      <>
                        <button onClick={() => act(a.id, 'reject')} disabled={actingId === a.id} className="text-slate-500 hover:text-rose-600 text-sm font-bold bg-slate-50 hover:bg-rose-50 px-3 py-1.5 rounded-lg disabled:opacity-50">Reject</button>
                        <button onClick={() => act(a.id, 'approve')} disabled={actingId === a.id} className="text-emerald-700 hover:text-emerald-800 text-sm font-bold bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg disabled:opacity-50">Approve</button>
                      </>
                    )}
                    {tab === 'approved' && (
                      <button onClick={() => act(a.id, 'revoke')} disabled={actingId === a.id} className="text-rose-600 hover:text-rose-700 text-sm font-bold bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg disabled:opacity-50">Revoke</button>
                    )}
                  </div>
                )
              },
            ]}
            data={applications}
            loading={loading}
            emptyMessage={`No ${tab} applications.`}
          />
        </div>
      )}
    </div>
  );
}
