import { useEffect } from 'react';
import { MessageCircle, ExternalLink, Users, Clock, CheckCircle } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { useD1Query } from '../hooks/useD1Query';

export default function ChatPage() {
  const { data, loading, refetch } = useD1Query<{
    sessions: Array<{
      id: string; user_email: string; user_name: string;
      status: string; started_at: string; last_message_at: string;
    }>;
    total: number;
  }>('/submissions?type=chats');

  useEffect(() => { refetch(); }, [refetch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Live Chat</h1>
          <p className="text-sm text-slate-400 mt-0.5">Powered by tawk.to — manage chats from the tawk.to dashboard</p>
        </div>
        <a
          href="https://dashboard.tawk.to"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 h-10 bg-indigo-600 rounded-control shadow-raised hover:-translate-y-0.5 transition-all text-white text-sm font-semibold px-4"
        >
          <MessageCircle className="w-4 h-4" />
          Open tawk.to Dashboard
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-card bg-indigo-500/10 border border-indigo-500/20 p-5 shadow-floating">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-indigo-400" />
            <div>
              <p className="text-2xl font-black text-white">{loading ? '—' : data?.total ?? 0}</p>
              <p className="text-xs text-slate-400">Total Chat Sessions</p>
            </div>
          </div>
        </div>
        <div className="rounded-card bg-emerald-500/10 border border-emerald-500/20 p-5 shadow-floating">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-2xl font-black text-white">tawk.to</p>
              <p className="text-xs text-slate-400">Chat Provider (Free)</p>
            </div>
          </div>
        </div>
        <div className="rounded-card bg-violet-500/10 border border-violet-500/20 p-5 shadow-floating">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-violet-400" />
            <div>
              <p className="text-2xl font-black text-white">Real-time</p>
              <p className="text-xs text-slate-400">via WebSocket</p>
            </div>
          </div>
        </div>
      </div>

      {/* How to use tawk.to */}
      <div className="premium-glass-card rounded-card border-surface-800 p-6">
        <h2 className="text-base font-bold text-white mb-4">How to Respond to Chats</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Open tawk.to Dashboard', desc: 'Click the button above to go to dashboard.tawk.to. All live chats appear here in real-time.' },
            { step: '2', title: 'Install Mobile App', desc: 'Get push notifications on iOS/Android. Search "tawk.to" in your app store. Login with your tawk.to account.' },
            { step: '3', title: 'Configure Pre-chat Form', desc: 'In tawk.to Settings → Pre-Chat Form, enable Name + Email fields so visitors are identified.' },
          ].map(item => (
            <div key={item.step} className="flex gap-3">
              <div className="w-7 h-7 bg-indigo-600/20 border border-indigo-500/30 rounded-full flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0 mt-0.5">{item.step}</div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat session log (from webhooks) */}
      <div className="premium-glass-card rounded-card border-surface-800 p-5">
        <h2 className="text-sm font-bold text-white mb-4">Chat Session Log (Synced from tawk.to via webhooks)</h2>
        <DataTable
          loading={loading}
          data={(data?.sessions as unknown as Record<string, unknown>[]) || []}
          columns={[
            { key: 'user_email', label: 'User Email' },
            { key: 'user_name', label: 'Name' },
            { key: 'status', label: 'Status', render: row => (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                row.status === 'active' ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-slate-700/60 text-slate-400'
              }`}>{String(row.status)}</span>
            )},
            { key: 'started_at', label: 'Started', render: row => (
              <span className="text-slate-400 text-xs">{new Date(String(row.started_at)).toLocaleString()}</span>
            )},
          ]}
          emptyMessage="No chat sessions yet. Webhooks will populate this table once chats occur."
        />
      </div>
    </div>
  );
}
