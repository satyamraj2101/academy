import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Sparkles, Copy, Loader2 } from 'lucide-react';
import { useD1Query, adminFetch } from '../../hooks/useD1Query';
import { DataTable } from '../../components/DataTable';
import { toast } from '../../../lib/toast';

interface Course extends Record<string, unknown> {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  students?: number;
  instructor_name?: string | null;
  instructor_email?: string | null;
}

export default function CourseManagerPage() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useD1Query<{ courses: Course[], total: number }>('/academy/courses');
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const courses = data?.courses || [];

  const handleDuplicate = async (courseId: string) => {
    setDuplicatingId(courseId);
    try {
      await adminFetch(`/academy/courses/${courseId}/duplicate`, { method: 'POST' });
      toast.success('Course duplicated');
      await refetch();
    } catch (e: any) {
      toast.error(e.message || 'Failed to duplicate course');
    } finally {
      setDuplicatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 min-w-0">
            <BookOpen className="w-6 h-6 text-indigo-600 shrink-0" />
            <span className="truncate">Course Manager</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage and create courses for the Academy.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/admin/academy/courses/wizard')}
            className="flex items-center gap-2 h-10 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:shadow transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Generate with AI</span>
            <span className="sm:hidden">AI Wizard</span>
          </button>
          <button
            onClick={() => navigate('/admin/academy/courses/new')}
            className="flex items-center gap-2 h-10 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create Course</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-red-500 shadow-sm font-medium">
          Error loading courses: {error}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
          <DataTable<Course>
            columns={[
              { key: 'title', label: 'Course Title', render: c => <p className="font-bold text-slate-900 text-sm">{c.title}</p> },
              {
                key: 'instructor_name', label: 'Instructor', hideOnMobile: true, render: c => (
                  c.instructor_name
                    ? <span className="text-sm text-slate-700" title={c.instructor_email || ''}>{c.instructor_name}</span>
                    : <span className="text-xs text-slate-400 uppercase tracking-wide">In-house</span>
                )
              },
              {
                key: 'status', label: 'Status', hideOnMobile: true, render: c => (
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    c.status === 'published'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>
                    {c.status}
                  </span>
                )
              },
              { key: 'students', label: 'Students Enrolled', hideOnMobile: true, render: c => <span>{c.students ?? 0}</span> },
              { key: 'updated_at', label: 'Last Updated', hideOnMobile: true, render: c => <span>{new Date(c.updated_at).toLocaleDateString()}</span> },
              {
                key: 'actions', label: '', className: 'text-right', render: c => (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleDuplicate(c.id)}
                      disabled={duplicatingId === c.id}
                      title="Duplicate course"
                      className="text-slate-500 hover:text-slate-700 text-sm font-bold transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {duplicatingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => navigate(`/admin/academy/courses/${c.id}`)}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-bold transition-colors bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg"
                    >
                      Edit
                    </button>
                  </div>
                )
              },
            ]}
            data={courses}
            loading={loading}
            searchable
            searchKeys={['title']}
            emptyMessage="No courses found."
          />
        </div>
      )}
    </div>
  );
}
