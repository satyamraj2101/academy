import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academyAPI } from '../../academy/api';
import { toast } from '../../lib/toast';
import { HapticButton } from '../../components/HapticButton';
import { Loader2, Users, CheckCircle2, Clock } from 'lucide-react';

interface PeerReview {
  id: string;
  status: 'pending' | 'submitted';
  feedback_text: string | null;
  score: number | null;
  prompt_text: string;
  submission_text: string | null;
  submission_file_url: string | null;
  max_score: number;
  author_name: string;
}

export function PeerReviewsComponent() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, { feedback: string; score: string }>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['academy', 'peer-reviews'],
    queryFn: () => academyAPI.peerReviews.list() as Promise<{ reviews: PeerReview[] }>,
  });

  const submitMutation = useMutation({
    mutationFn: ({ id, feedback, score }: { id: string; feedback: string; score?: number }) =>
      academyAPI.peerReviews.submit(id, feedback, score),
    onSuccess: () => {
      toast.success('Review submitted');
      queryClient.invalidateQueries({ queryKey: ['academy', 'peer-reviews'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const reviews = data?.reviews || [];
  const pending = reviews.filter(r => r.status === 'pending');
  const submitted = reviews.filter(r => r.status === 'submitted');

  return (
    <div className="pt-24 pb-16 min-h-screen bg-surface-50 dark:bg-surface-950">
      <Helmet>
        <title>Peer Reviews | SpotCLM Academy</title>
      </Helmet>
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-7 h-7 text-indigo-500" />
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Peer Reviews</h1>
        </div>
        <p className="text-slate-600 dark:text-slate-400 mb-8">Review assignments submitted by fellow students.</p>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
        ) : reviews.length === 0 ? (
          <p className="text-center text-slate-400 italic py-16">No peer reviews assigned to you yet.</p>
        ) : (
          <div className="space-y-6">
            {pending.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> To Review ({pending.length})</h2>
                {pending.map(r => {
                  const draft = drafts[r.id] || { feedback: '', score: '' };
                  return (
                    <div key={r.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card p-5 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 mb-1">Submission by {r.author_name}</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mb-3">{r.prompt_text}</p>
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mb-3 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                        {r.submission_text || 'No text submitted.'}
                        {r.submission_file_url && (
                          <div className="mt-2"><a href={r.submission_file_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-xs font-bold">View submitted file</a></div>
                        )}
                      </div>
                      <textarea
                        value={draft.feedback}
                        onChange={e => setDrafts(prev => ({ ...prev, [r.id]: { ...draft, feedback: e.target.value } }))}
                        placeholder="Write constructive feedback for your peer..."
                        rows={3}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-indigo-500"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>Score (optional):</span>
                          <input
                            type="number"
                            min={0}
                            max={r.max_score || 100}
                            value={draft.score}
                            onChange={e => setDrafts(prev => ({ ...prev, [r.id]: { ...draft, score: e.target.value } }))}
                            className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-center focus:outline-none focus:border-indigo-500"
                          />
                          <span>/ {r.max_score || 100}</span>
                        </div>
                        <HapticButton
                          onClick={() => submitMutation.mutate({ id: r.id, feedback: draft.feedback, score: draft.score ? Number(draft.score) : undefined })}
                          disabled={!draft.feedback.trim() || submitMutation.isPending}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm"
                        >
                          Submit Review
                        </HapticButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {submitted.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Reviewed ({submitted.length})</h2>
                {submitted.map(r => (
                  <div key={r.id} className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-lg p-4 text-sm">
                    <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">{r.prompt_text}</p>
                    <p className="text-slate-500 dark:text-slate-400">{r.feedback_text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
