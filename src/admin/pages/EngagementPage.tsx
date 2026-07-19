import { useEffect } from 'react';
import { Zap } from 'lucide-react';
import { ActivityFeed } from '../components/ActivityFeed';
import { useD1Query } from '../hooks/useD1Query';

export default function EngagementPage() {
  const { data, loading, refetch } = useD1Query<{
    events: Array<{ event_type: string; page?: string; email?: string; created_at: string }>;
    eventBreakdown: Array<{ event_type: string; count: number }>;
  }>('/tracking');

  useEffect(() => { refetch({ view: 'events', limit: '50' }); }, [refetch]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Engagement</h1>
        <p className="text-sm text-slate-400 mt-0.5">Live activity and user engagement events</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 premium-glass-card rounded-card border-surface-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Recent Events</h2>
          </div>
          <ActivityFeed events={data?.events || []} loading={loading} />
        </div>

        <div className="premium-glass-card rounded-card border-surface-800 p-5 h-fit">
          <h2 className="text-sm font-bold text-white mb-4">Event Breakdown</h2>
          {loading ? (
            <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-8 bg-slate-700/40 rounded animate-pulse" />)}</div>
          ) : (
            <div className="space-y-2">
              {(data?.eventBreakdown || []).map(e => (
                <div key={e.event_type} className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 capitalize">{e.event_type?.replace('_', ' ')}</span>
                  <span className="text-xs font-bold text-indigo-400">{e.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
