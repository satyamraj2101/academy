import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academyAPI } from '../../academy/api';
import { useAcademy } from '../../academy/context';
import { HapticButton } from '../../components/HapticButton';
import { toast } from '../../lib/toast';
import { Loader2, Send, MessageCircle, ShieldCheck, ArrowBigUp, Reply, Award } from 'lucide-react';

interface Discussion {
  id: string;
  parent_id: string | null;
  message: string;
  created_at: string;
  user_id: string;
  user_name: string;
  user_role: string;
  upvote_count: number;
  upvoted_by_me: number | boolean;
  is_best_answer: number | boolean;
}

export function DiscussionPanel({ lessonId }: { lessonId: string }) {
  const queryClient = useQueryClient();
  const { user } = useAcademy();
  const [message, setMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['discussions', lessonId],
    queryFn: () => academyAPI.discussions.list(lessonId) as Promise<{ discussions: Discussion[] }>,
    enabled: !!lessonId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['discussions', lessonId] });

  const postMutation = useMutation({
    mutationFn: () => academyAPI.discussions.create(lessonId, message),
    onSuccess: () => { setMessage(''); invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const replyMutation = useMutation({
    mutationFn: (parentId: string) => academyAPI.discussions.create(lessonId, replyText, parentId),
    onSuccess: () => { setReplyText(''); setReplyingTo(null); invalidate(); },
    onError: (err: any) => toast.error(err.message),
  });

  const upvoteMutation = useMutation({
    mutationFn: (discussionId: string) => academyAPI.discussions.upvote(discussionId),
    onSuccess: invalidate,
    onError: (err: any) => toast.error(err.message),
  });

  const bestAnswerMutation = useMutation({
    mutationFn: (discussionId: string) => academyAPI.discussions.markBestAnswer(discussionId),
    onSuccess: invalidate,
    onError: (err: any) => toast.error(err.message),
  });

  const discussions = data?.discussions || [];
  const threads = discussions.filter(d => !d.parent_id);
  const repliesByParent = new Map<string, Discussion[]>();
  for (const d of discussions) {
    if (d.parent_id) {
      if (!repliesByParent.has(d.parent_id)) repliesByParent.set(d.parent_id, []);
      repliesByParent.get(d.parent_id)!.push(d);
    }
  }

  const isInstructor = user?.role === 'admin' || user?.role === 'superadmin';

  const renderPost = (d: Discussion, isReply: boolean) => (
    <div key={d.id} className={`rounded-lg p-3 border ${d.is_best_answer ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-300 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-[10px] shrink-0">
          {d.user_name?.charAt(0) || '?'}
        </div>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{d.user_name}</span>
        {(d.user_role === 'admin' || d.user_role === 'superadmin') && (
          <span className="flex items-center gap-0.5 text-[10px] font-black text-indigo-500"><ShieldCheck className="w-3 h-3" /> Instructor</span>
        )}
        {!!d.is_best_answer && (
          <span className="flex items-center gap-0.5 text-[10px] font-black text-emerald-600"><Award className="w-3 h-3" /> Best Answer</span>
        )}
        <span className="text-[10px] text-slate-400 ml-auto">{new Date(d.created_at).toLocaleDateString()}</span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{d.message}</p>
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={() => upvoteMutation.mutate(d.id)}
          disabled={upvoteMutation.isPending}
          className={`flex items-center gap-1 text-xs font-bold transition-colors ${d.upvoted_by_me ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
        >
          <ArrowBigUp className="w-3.5 h-3.5" /> {d.upvote_count || 0}
        </button>
        {!isReply && (
          <button
            onClick={() => { setReplyingTo(replyingTo === d.id ? null : d.id); setReplyText(''); }}
            className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <Reply className="w-3.5 h-3.5" /> Reply
          </button>
        )}
        {isReply && isInstructor && (
          <button
            onClick={() => bestAnswerMutation.mutate(d.id)}
            disabled={bestAnswerMutation.isPending}
            className={`flex items-center gap-1 text-xs font-bold transition-colors ${d.is_best_answer ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}
          >
            <Award className="w-3.5 h-3.5" /> {d.is_best_answer ? 'Unmark' : 'Mark Best Answer'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-indigo-500" />
        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Lesson Q&amp;A</h4>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>}
        {!isLoading && threads.length === 0 && (
          <p className="text-sm text-slate-400 italic text-center py-8">No questions yet. Be the first to ask!</p>
        )}
        {threads.map(thread => (
          <div key={thread.id} className="space-y-2">
            {renderPost(thread, false)}
            {(repliesByParent.get(thread.id) || []).length > 0 && (
              <div className="pl-6 space-y-2 border-l-2 border-slate-200 dark:border-slate-700 ml-3">
                {repliesByParent.get(thread.id)!.map(reply => renderPost(reply, true))}
              </div>
            )}
            {replyingTo === thread.id && (
              <div className="pl-6 ml-3 flex gap-2">
                <textarea
                  autoFocus
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  rows={2}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-indigo-500"
                />
                <HapticButton
                  onClick={() => replyText.trim() && replyMutation.mutate(thread.id)}
                  disabled={!replyText.trim() || replyMutation.isPending}
                  className="px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shrink-0 transition-all"
                >
                  {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </HapticButton>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex gap-2">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Ask a question about this lesson..."
            rows={2}
            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-indigo-500"
          />
          <HapticButton
            onClick={() => message.trim() && postMutation.mutate()}
            disabled={!message.trim() || postMutation.isPending}
            className="px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shrink-0 transition-all"
          >
            {postMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </HapticButton>
        </div>
      </div>
    </div>
  );
}
