import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { academyAPI } from '../../academy/api';
import { useAcademy } from '../../academy/context';
import { Loader2 } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  full_name: string;
  avatar_url?: string;
  points: number;
}

export function LeaderboardComponent() {
  const { user } = useAcademy();

  const { data, isLoading } = useQuery({
    queryKey: ['academy', 'gamification', 'leaderboard'],
    queryFn: () => academyAPI.gamification.leaderboard() as Promise<{ leaderboard: LeaderboardEntry[]; myPoints: number; myRank: number }>,
  });

  const leaderboard = data?.leaderboard || [];

  return (
    <div className="pt-24 pb-16 min-h-screen bg-surface-50 dark:bg-surface-950">
      <Helmet>
        <title>Leaderboard | SpotCLM Academy</title>
      </Helmet>
      <div className="max-w-2xl mx-auto px-6">
        <h1 className="text-3xl font-medium text-slate-900 dark:text-white">Leaderboard</h1>
        <p className="mt-1 mb-8 text-slate-600 dark:text-slate-400">Top learners by points earned across all courses.</p>

        {data && (
          <div className="mb-6 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-card p-4 flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Your rank <span className="tabular text-slate-900 dark:text-white">{data.myRank ? `#${data.myRank}` : 'not ranked yet'}</span></span>
            <span className="tabular text-sm text-slate-900 dark:text-white">{data.myPoints ?? 0} pts</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
        ) : leaderboard.length === 0 ? (
          <p className="text-center text-slate-400 py-16">No one has earned points yet.</p>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
            {leaderboard.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center gap-4 px-5 py-4 ${entry.id === user?.id ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
              >
                <span className={`tabular w-7 text-center text-sm ${i < 3 ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{i + 1}</span>
                <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-medium text-sm shrink-0">
                  {entry.full_name?.charAt(0) || '?'}
                </div>
                <span className="flex-1 font-medium text-slate-900 dark:text-white truncate">{entry.full_name}</span>
                <span className="tabular text-slate-900 dark:text-white">{entry.points} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
