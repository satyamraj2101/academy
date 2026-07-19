import { useEffect } from 'react';
import { Globe, Monitor, Smartphone } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { useD1Query } from '../hooks/useD1Query';

export default function TrackingPage() {
  const { data, loading, refetch } = useD1Query<{
    sessions: Array<{ id: string; email: string; country: string; device_type: string; page_views: number; is_converted: number; first_seen: string; last_seen: string; referrer: string; }>;
    total: number;
  }>('/tracking');

  const { data: stats, refetch: refetchStats } = useD1Query<{
    topCountries: Array<{ country: string; count: number }>;
    deviceBreakdown: Array<{ device_type: string; count: number }>;
    topPages: Array<{ page: string; views: number }>;
    totalSessions: number;
    conversionRate: number;
  }>('/tracking');

  useEffect(() => {
    refetch({ view: 'sessions' });
    refetchStats({ view: 'stats' });
  }, [refetch, refetchStats]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">User Tracking</h1>
        <p className="text-sm text-slate-400 mt-0.5">Session and geographic data</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="premium-glass-card rounded-card border-surface-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold text-white">Top Countries</h2>
          </div>
          {(stats?.topCountries || []).slice(0, 8).map(c => (
            <div key={c.country} className="flex justify-between py-1.5 border-b border-slate-800/40 last:border-0">
              <span className="text-xs text-slate-400">{c.country || 'Unknown'}</span>
              <span className="text-xs font-bold text-slate-200">{c.count}</span>
            </div>
          ))}
          {!loading && !stats?.topCountries?.length && <p className="text-xs text-slate-500">No data yet</p>}
        </div>

        <div className="premium-glass-card rounded-card border-surface-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-bold text-white">Device Types</h2>
          </div>
          {(stats?.deviceBreakdown || []).map(d => (
            <div key={d.device_type} className="flex justify-between py-1.5 border-b border-slate-800/40 last:border-0">
              <div className="flex items-center gap-2">
                {d.device_type === 'mobile' ? <Smartphone className="w-3 h-3 text-slate-500" /> : <Monitor className="w-3 h-3 text-slate-500" />}
                <span className="text-xs text-slate-400 capitalize">{d.device_type || 'Unknown'}</span>
              </div>
              <span className="text-xs font-bold text-slate-200">{d.count}</span>
            </div>
          ))}
        </div>

        <div className="premium-glass-card rounded-card border-surface-800 p-5">
          <h2 className="text-sm font-bold text-white mb-3">Top Pages</h2>
          {(stats?.topPages || []).slice(0, 8).map(p => (
            <div key={p.page} className="flex justify-between py-1.5 border-b border-slate-800/40 last:border-0">
              <span className="text-xs text-slate-400 truncate flex-1 mr-2">{p.page}</span>
              <span className="text-xs font-bold text-slate-200">{p.views}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="premium-glass-card rounded-card border-surface-800 p-5">
        <h2 className="text-sm font-bold text-white mb-4">User Sessions</h2>
        <DataTable
          loading={loading}
          data={(data?.sessions as unknown as Record<string, unknown>[]) || []}
          searchable
          columns={[
            { key: 'email', label: 'Email', render: row => <span className="text-xs">{String(row.email || 'Anonymous')}</span> },
            { key: 'country', label: 'Country', className: 'hidden sm:table-cell' },
            { key: 'device_type', label: 'Device', className: 'hidden md:table-cell', render: row => <span className="capitalize">{String(row.device_type || 'unknown')}</span> },
            { key: 'page_views', label: 'Pages', render: row => <span className="font-bold text-indigo-400">{String(row.page_views)}</span> },
            { key: 'is_converted', label: 'Converted', render: row => (
              <span className={`text-xs font-bold ${row.is_converted ? 'text-emerald-400' : 'text-slate-500'}`}>{row.is_converted ? 'Yes' : 'No'}</span>
            )},
            { key: 'last_seen', label: 'Last Seen', render: row => (
              <span className="text-xs text-slate-400">{new Date(String(row.last_seen)).toLocaleDateString()}</span>
            )},
          ]}
          emptyMessage="No sessions tracked yet. Tracking begins when users visit the site."
        />
      </div>
    </div>
  );
}
