import { useState } from 'react';
import { BarChart3, Download } from 'lucide-react';

const EXPORTS = [
  { type: 'enquiries', label: 'Enquiries', desc: 'All form submissions with status and reply history', color: 'indigo' },
  { type: 'assessments', label: 'Assessments', desc: 'CLM assessment results with scores and recommendations', color: 'emerald' },
  { type: 'sessions', label: 'User Sessions', desc: 'Visitor sessions with geo, device, and conversion data', color: 'sky' },
  { type: 'chats', label: 'Chat Transcripts', desc: 'All chat messages synced from tawk.to via webhooks', color: 'violet' },
  { type: 'audit', label: 'Audit Log', desc: 'Admin action history — immutable record', color: 'amber' },
];

const colorMap: Record<string, string> = {
  indigo: 'bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-400',
  emerald: 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400',
  sky: 'bg-sky-500/10 border-sky-500/20 hover:bg-sky-500/20 text-sky-400',
  violet: 'bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/20 text-violet-400',
  amber: 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 text-amber-400',
};

export default function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  const download = async (type: string) => {
    setDownloading(type);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const devAdmin = localStorage.getItem('spotclm_admin_dev');
    if (devAdmin) {
      try { headers['Authorization'] = `Bearer ${JSON.parse(devAdmin).email}`; } catch { /* ignore */ }
    }
    const params = new URLSearchParams({ type });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    try {
      const res = await fetch(`/api/admin/export?${params}`, { headers });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spotclm-${type}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Reports & CSV Export</h1>
        <p className="text-sm text-slate-400 mt-0.5">Download data as CSV for analysis</p>
      </div>

      {/* Date filters */}
      <div className="premium-glass-card rounded-card border-surface-800 p-5">
        <h2 className="text-sm font-bold text-white mb-4">Date Range Filter</h2>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/60" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/60" />
          </div>
          <div className="flex items-end">
            <button onClick={() => { setFrom(''); setTo(''); }} className="text-xs text-slate-400 hover:text-white transition-colors py-2">Clear</button>
          </div>
        </div>
      </div>

      {/* Export cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXPORTS.map(exp => (
          <div key={exp.type} className={`rounded-card shadow-floating border ${colorMap[exp.color]} transition-all p-5`}>
            <div className="flex items-start justify-between mb-3">
              <BarChart3 className="w-5 h-5" />
              <button
                onClick={() => download(exp.type)}
                disabled={downloading === exp.type}
                className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
              >
                <Download className="w-3 h-3" />
                {downloading === exp.type ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
            <h3 className="font-bold text-white text-sm mb-1">{exp.label}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{exp.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
