import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAcademy } from '../../academy/context';
import { instructorAPI } from '../../academy/instructorApi';
import { toast } from '../../lib/toast';
import { HapticButton } from '../../components/HapticButton';
import { Loader2, GraduationCap, Plus, Users, BookOpen, ClipboardCheck } from 'lucide-react';

interface InstructorCourse {
  id: string;
  title: string;
  status: string;
  active_enrollments: number;
}

export function InstructorDashboardComponent() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useAcademy();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [applyBio, setApplyBio] = useState('');

  const { data: applyStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['instructor', 'apply-status'],
    queryFn: () => instructorAPI.apply.status() as Promise<{ instructor_status: string }>,
    enabled: !!user && user.role !== 'instructor',
  });

  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['instructor', 'courses'],
    queryFn: () => instructorAPI.courses.list() as Promise<{ courses: InstructorCourse[] }>,
    enabled: user?.role === 'instructor',
  });

  const applyMutation = useMutation({
    mutationFn: () => instructorAPI.apply.submit(applyBio),
    onSuccess: () => {
      toast.success('Application submitted — an admin will review it.');
      queryClient.invalidateQueries({ queryKey: ['instructor', 'apply-status'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createMutation = useMutation({
    mutationFn: () => instructorAPI.courses.create({ title: newTitle }),
    onSuccess: (res: any) => {
      toast.success('Course created');
      navigate(`/instructor/courses/${res.id}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (userLoading) return <div className="min-h-screen pt-32 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-500" /></div>;

  if (user?.role !== 'instructor') {
    const status = applyStatus?.instructor_status || 'none';
    return (
      <div className="pt-24 pb-16 min-h-screen bg-surface-50 dark:bg-surface-950">
        <Helmet><title>Become an Instructor | SpotCLM Academy</title></Helmet>
        <div className="max-w-lg mx-auto px-6 text-center">
          <GraduationCap className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Become an Instructor</h1>
          {statusLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-500 mx-auto mt-6" />
          ) : status === 'pending' ? (
            <p className="text-slate-600 dark:text-slate-400">Your application is pending review. You'll be notified once an admin approves it.</p>
          ) : status === 'rejected' || status === 'revoked' ? (
            <p className="text-slate-600 dark:text-slate-400">Your previous application wasn't approved. Contact support if you'd like to reapply.</p>
          ) : (
            <>
              <p className="text-slate-600 dark:text-slate-400 mb-6">Share a bit about your expertise. An admin reviews every application before approval.</p>
              <textarea
                value={applyBio}
                onChange={e => setApplyBio(e.target.value)}
                rows={4}
                placeholder="What will you teach, and what's your background?"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 text-sm mb-4 focus:outline-none focus:border-indigo-500"
              />
              <HapticButton
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-control font-medium"
              >
                {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
              </HapticButton>
            </>
          )}
        </div>
      </div>
    );
  }

  const courses = coursesData?.courses || [];

  return (
    <div className="pt-24 pb-16 min-h-screen bg-surface-50 dark:bg-surface-950">
      <Helmet><title>Instructor Dashboard | SpotCLM Academy</title></Helmet>
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white ">Instructor Dashboard</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Manage the courses you've created.</p>
          </div>
          <div className="flex gap-3">
            <HapticButton onClick={() => navigate('/instructor/grading')} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-sm flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" /> Grading
            </HapticButton>
            <HapticButton onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Course
            </HapticButton>
          </div>
        </div>

        {coursesLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-200 dark:border-slate-800 rounded-card">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">You haven't created any courses yet.</p>
            <HapticButton onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm">Create Your First Course</HapticButton>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map(c => (
              <div
                key={c.id}
                onClick={() => navigate(`/instructor/courses/${c.id}`)}
                className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-control p-5 cursor-pointer hover:border-indigo-300 transition-colors shadow-sm"
              >
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">{c.title}</h3>
                  <span className={`inline-block mt-1 text-[10px] font-medium   px-2 py-0.5 rounded-full ${c.status === 'published' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{c.status}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                  <Users className="w-4 h-4" /> {c.active_enrollments}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-card w-full max-w-sm p-6 shadow-floating">
            <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-4">New Course</h3>
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Course title"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm mb-4 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 font-medium text-sm text-slate-600 hover:text-slate-900">Cancel</button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!newTitle.trim() || createMutation.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm"
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
