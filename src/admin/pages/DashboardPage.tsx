import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, MessageCircle, FileText, BrainCircuit, TrendingUp, ExternalLink, Library, Sparkles, BookOpen } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { ActivityFeed } from '../components/ActivityFeed';
import { useD1Query } from '../hooks/useD1Query';

interface DashboardData {
  stats: {
    todayEnquiries: number;
    todaySessions: number;
    todayChats: number;
    todayAssessments: number;
    newEnquiries: number;
    totalEnquiries: number;
    conversionRate: number;
  };
  recentActivity: Array<{ event_type: string; page?: string; email?: string; created_at: string }>;
  enquiryStatus: Array<{ status: string; count: number }>;
  topPages: Array<{ page: string; views: number }>;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useD1Query<DashboardData>('/dashboard');

  useEffect(() => { refetch(); }, [refetch]);

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight truncate">Command Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time overview of SpotCLM activity</p>
        </div>
        <a
          href="https://dashboard.tawk.to"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 h-10 bg-indigo-600 rounded-lg shadow-sm hover:shadow hover:-translate-y-0.5 transition-all text-white text-sm font-bold px-4 shrink-0"
        >
          <MessageCircle className="w-4 h-4" />
          Open Live Chat
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Academy quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/admin/academy/library')}
          className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-indigo-300 hover:shadow transition-all text-left"
        >
          <div className="p-2.5 rounded-lg bg-indigo-50 shrink-0"><Library className="w-5 h-5 text-indigo-600" /></div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">Global Library</p>
            <p className="text-xs text-slate-500 truncate">Assets, quizzes &amp; assignment templates</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/admin/academy/courses/wizard')}
          className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-violet-300 hover:shadow transition-all text-left"
        >
          <div className="p-2.5 rounded-lg bg-violet-50 shrink-0"><Sparkles className="w-5 h-5 text-violet-600" /></div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">AI Course Wizard</p>
            <p className="text-xs text-slate-500 truncate">Generate a full course outline with AI</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/admin/academy/courses')}
          className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-emerald-300 hover:shadow transition-all text-left"
        >
          <div className="p-2.5 rounded-lg bg-emerald-50 shrink-0"><BookOpen className="w-5 h-5 text-emerald-600" /></div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">Course Manager</p>
            <p className="text-xs text-slate-500 truncate">Manage and edit academy courses</p>
          </div>
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Enquiries"
          value={loading ? '—' : stats?.todayEnquiries ?? 0}
          sub={`${stats?.newEnquiries ?? 0} unread`}
          icon={<FileText className="w-4 h-4" />}
          color="indigo"
          loading={loading}
        />
        <StatCard
          label="Today's Visitors"
          value={loading ? '—' : stats?.todaySessions ?? 0}
          icon={<Users className="w-4 h-4" />}
          color="sky"
          loading={loading}
        />
        <StatCard
          label="Today's Chats"
          value={loading ? '—' : stats?.todayChats ?? 0}
          icon={<MessageCircle className="w-4 h-4" />}
          color="violet"
          loading={loading}
        />
        <StatCard
          label="Assessments Run"
          value={loading ? '—' : stats?.todayAssessments ?? 0}
          icon={<BrainCircuit className="w-4 h-4" />}
          color="emerald"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity feed */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Live Activity Feed</h2>
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Live
            </span>
          </div>
          <ActivityFeed events={data?.recentActivity || []} loading={loading} />
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Enquiry status breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Enquiry Status</h2>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {(data?.enquiryStatus || []).map(s => (
                  <div key={s.status} className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 capitalize">{s.status}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                      s.status === 'new' ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : s.status === 'replied' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top pages */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Top Pages</h2>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {(data?.topPages || []).slice(0, 6).map(p => (
                  <div key={p.page} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 truncate flex-1 mr-2">{p.page}</span>
                    <span className="text-xs font-bold text-slate-800">{p.views}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Conversion rate */}
          <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Conversion Rate</h2>
            </div>
            <p className="text-4xl font-black text-slate-900">{loading ? '—' : `${stats?.conversionRate ?? 0}%`}</p>
            <p className="text-xs text-slate-500 mt-1">Visitors who submitted a form</p>
          </div>
        </div>
      </div>
    </div>
  );
}
