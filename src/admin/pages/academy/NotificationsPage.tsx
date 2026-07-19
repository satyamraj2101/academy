import { useState } from 'react';
import { Bell, Send, Loader2, RotateCcw, Users, BookOpen, User } from 'lucide-react';
import { useD1Query, adminFetch } from '../../hooks/useD1Query';
import { toast } from '../../../lib/toast';

interface Course extends Record<string, unknown> { id: string; title: string; status: string; }
interface Student extends Record<string, unknown> { id: string; full_name: string; email: string; }

type Audience = 'all' | 'course' | 'user';

export default function NotificationsPage() {
  const { data: coursesData } = useD1Query<{ courses: Course[] }>('/academy/courses?pageSize=200');
  const { data: studentsData } = useD1Query<{ students: Student[] }>('/academy/students?pageSize=500');

  const courses = coursesData?.courses || [];
  const students = studentsData?.students || [];

  const [audience, setAudience] = useState<Audience>('all');
  const [courseId, setCourseId] = useState('');
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    if (audience === 'course' && !courseId) {
      toast.error('Choose a course');
      return;
    }
    if (audience === 'user' && !userId) {
      toast.error('Choose a student');
      return;
    }
    setSending(true);
    try {
      const res = await adminFetch('/academy/notifications', {
        method: 'POST',
        body: JSON.stringify({ audience, courseId: courseId || undefined, userId: userId || undefined, title: title.trim(), message: message.trim(), action_url: actionUrl.trim() || undefined }),
      }) as { sent: number };
      toast.success(`Sent to ${res.sent} student${res.sent === 1 ? '' : 's'}`);
      setTitle('');
      setMessage('');
      setActionUrl('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const handleSendReminders = async () => {
    setSendingReminders(true);
    try {
      const res = await adminFetch('/academy/notifications', {
        method: 'POST',
        body: JSON.stringify({ type: 'reminders' }),
      }) as { sent: number };
      toast.success(`Reminder sent to ${res.sent} in-progress student${res.sent === 1 ? '' : 's'}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to send reminders');
    } finally {
      setSendingReminders(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Bell className="w-6 h-6 text-indigo-600" />
          Notifications
        </h1>
        <p className="text-sm text-slate-500 mt-1">Send announcements to students, or nudge everyone mid-course to keep going.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-500 shrink-0"><RotateCcw className="w-5 h-5" /></div>
          <div>
            <h3 className="font-bold text-sm text-slate-800">Remind in-progress students</h3>
            <p className="text-xs text-slate-500">One-click nudge to every student between 1% and 99% complete on any course.</p>
          </div>
        </div>
        <button
          onClick={handleSendReminders}
          disabled={sendingReminders}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg font-bold text-sm shadow-sm transition-all shrink-0"
        >
          {sendingReminders ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          Send Reminders
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
        <h3 className="font-bold text-sm text-slate-800">Compose a Notification</h3>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Audience</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'all', label: 'All Students', icon: Users },
              { value: 'course', label: 'By Course', icon: BookOpen },
              { value: 'user', label: 'One Student', icon: User },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setAudience(opt.value as Audience)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border-2 transition-all text-xs font-bold ${
                  audience === opt.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <opt.icon className="w-4 h-4" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {audience === 'course' && (
          <div>
            <label htmlFor="course-select" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Course</label>
            <select
              id="course-select"
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select a course...</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
        )}

        {audience === 'user' && (
          <div>
            <label htmlFor="student-select" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Student</label>
            <select
              id="student-select"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select a student...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>)}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="notif-title" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Title</label>
          <input
            id="notif-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. New certification now available"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-base sm:text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="notif-message" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Message</label>
          <textarea
            id="notif-message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            placeholder="Write the notification body..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-base sm:text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="notif-link" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Link (optional)</label>
          <input
            id="notif-link"
            value={actionUrl}
            onChange={e => setActionUrl(e.target.value)}
            placeholder="/courses/some-course-id"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-base sm:text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm shadow-sm transition-all"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send Notification
        </button>
      </div>
    </div>
  );
}
