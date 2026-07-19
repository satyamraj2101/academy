import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { academyAPI } from '../../academy/api';
import { useAcademy } from '../../academy/context';
import { Loader2, Trophy } from 'lucide-react';

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
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-7 h-7 text-amber-500" />
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Leaderboard</h1>
        </div>
        <p className="text-slate-600 dark:text-slate-400 mb-8">Top learners by points earned across all courses.</p>

        {data && (
          <div className="mb-6 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-900/40 rounded-card p-4 flex items-center justify-between">
            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Your rank: #{data.myRank}</span>
            <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">{data.myPoints} pts</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
        ) : leaderboard.length === 0 ? (
          <p className="text-center text-slate-400 italic py-16">No one has earned points yet — be the first!</p>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
            {leaderboard.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center gap-4 px-5 py-4 ${entry.id === user?.id ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
              >
                <span className={`w-7 text-center font-black text-sm ${i < 3 ? 'text-amber-500' : 'text-slate-400'}`}>{i + 1}</span>
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm shrink-0">
                  {entry.full_name?.charAt(0) || '?'}
                </div>
                <span className="flex-1 font-semibold text-slate-800 dark:text-slate-200 truncate">{entry.full_name}</span>
                <span className="font-black text-slate-900 dark:text-white">{entry.points} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
