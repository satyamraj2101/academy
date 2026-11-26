import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clapperboard, Loader2, Sparkles, TriangleAlert } from 'lucide-react';
import { adminFetch } from '../../hooks/useD1Query';
import { toast } from '../../../lib/toast';
import { PromptImprover } from '../PromptImprover';

interface Job {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
  progress?: { step?: string } | null;
  result?: { published?: { videoId?: string } } | null;
  error?: string | null;
}

interface Props {
  courseId: string;
  lessonId: string;
  videoId: string;
  /** Called with the new video's data once the rebuilt video is live, so the editor shows it (and a later Save keeps it). */
  onRebuilt: (newVideoJson: string) => void;
}

const QUICK = ['Make it shorter', 'Use simpler language', 'Add a real-world example', 'Rebuild from the updated lesson text'];
const POLL_MS = 4000;

/**
 * "Change this video with AI": the admin says what to change, a cloud worker rewrites the script (keeping the scenes that do
 * not need to change), renders only what changed and swaps the new video in. Progress is shown here until it is live.
 */
export function VideoAiEditPanel({ courseId, lessonId, videoId, onRebuilt }: Props) {
  const [request, setRequest] = useState('');
  const [job, setJob] = useState<Job | null>(null);
  const [sending, setSending] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const finished = useRef('');
  const active = !!job && (job.status === 'queued' || job.status === 'running');

  const finish = useCallback(async (j: Job) => {
    if (finished.current === j.id) return;
    finished.current = j.id;
    if (j.status === 'failed') { toast.error('The video was not changed', j.error || 'Something went wrong.'); return; }
    // Fetch what is now saved for this lesson and hand the new video block to the editor.
    try {
      const res = await adminFetch(`/academy/courses/${encodeURIComponent(courseId)}/structure`) as any;
      const newId = j.result?.published?.videoId;
      for (const m of res.structure || []) {
        const lesson = (m.lessons || []).find((l: any) => l.id === lessonId);
        const sec = (lesson?.sections || []).find((s: any) => { if (s.section_type !== 'interactive_video') return false; try { return JSON.parse(s.content).videoId === newId; } catch { return false; } });
        if (sec) { onRebuilt(sec.content); toast.success('Video updated', 'The new video is live in this lesson.'); return; }
      }
      toast.error('The video was rebuilt but could not be shown here', 'Reload the lesson to see it.');
    } catch (e: any) {
      toast.error('The video was rebuilt but could not be shown here', e.message || 'Reload the lesson to see it.');
    }
  }, [courseId, lessonId, onRebuilt]);

  // On open: pick up a rebuild that is already running for this lesson (for example after a page reload).
  useEffect(() => {
    let alive = true;
    adminFetch(`/academy/ai-jobs?lessonId=${encodeURIComponent(lessonId)}`).then((rows: any) => {
      const latest = (rows as Job[])?.[0];
      if (alive && latest && (latest.status === 'queued' || latest.status === 'running')) setJob(latest);
    }).catch(() => { /* nothing running, or the list is not available */ });
    return () => { alive = false; };
  }, [lessonId]);

  // While a job is active, watch it.
  useEffect(() => {
    if (!active || !job) return;
    const t0 = Date.now();
    const tick = window.setInterval(() => setSeconds(Math.round((Date.now() - t0) / 1000)), 1000);
    const poll = window.setInterval(async () => {
      try {
        const j = await adminFetch(`/academy/ai-jobs?id=${encodeURIComponent(job.id)}`) as Job;
        setJob(j);
        if (j.status === 'done' || j.status === 'failed') void finish(j);
      } catch { /* a missed poll is fine; the next one will catch up */ }
    }, POLL_MS);
    return () => { clearInterval(tick); clearInterval(poll); setSeconds(0); };
  }, [active, job?.id, finish]);

  const start = async () => {
    setSending(true);
    try {
      const res = await adminFetch('/academy/ai-jobs', { method: 'POST', body: JSON.stringify({ type: 'lesson_video_edit', payload: { courseId, lessonId, videoId, instruction: request.trim() } }) }) as { id: string; started?: boolean };
      finished.current = '';
      setJob({ id: res.id, status: 'queued', progress: { step: res.started ? 'Starting the cloud worker' : 'Waiting for the cloud worker' } });
      setRequest('');
    } catch (e: any) {
      toast.error('Could not start', e.message || 'Try again in a moment.');
    } finally {
      setSending(false);
    }
  };

  const step = job?.progress?.step || (job?.status === 'queued' ? 'Waiting for the cloud worker' : 'Working');

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 sm:p-4">
      <p className="flex items-center gap-1.5 text-sm font-bold text-sky-900"><Clapperboard className="w-4 h-4" aria-hidden="true" /> Change this video with AI</p>
      <p className="text-xs text-slate-600 mt-0.5">The AI rewrites only the scenes your request touches and makes a new video in the cloud (about 2 to 5 minutes). The current video stays live until the new one is ready. The video is built from the <strong>saved</strong> lesson text, so click Save Content first if you edited the text.</p>

      {!active ? (
        <>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK.map(q => (
              <button key={q} type="button" onClick={() => setRequest(q)} className="min-h-[36px] px-3 rounded-full border border-sky-200 bg-white text-xs font-semibold text-sky-800 hover:bg-sky-100">{q}</button>
            ))}
          </div>
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <textarea
              rows={2} value={request} maxLength={1500} onChange={e => setRequest(e.target.value)}
              aria-label="What should change in the video"
              placeholder="For example: change the quiz question to be about renewals, and make the second scene shorter"
              className="flex-1 min-h-[44px] rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-sky-400 resize-y"
            />
            <button type="button" onClick={start} disabled={sending}
              className="sm:self-start min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold disabled:opacity-50">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Sparkles className="w-4 h-4" aria-hidden="true" />}
              {request.trim() ? 'Change video' : 'Rebuild video'}
            </button>
          </div>
          <PromptImprover kind="video_note" text={request} onApply={v => { if (typeof v.improved === 'string') setRequest(v.improved); }} />
          {job?.status === 'failed' && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-rose-700" role="alert"><TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" /> The last try failed: {job.error || 'Something went wrong.'}</p>
          )}
          {job?.status === 'done' && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Done. The new video is shown above.</p>
          )}
        </>
      ) : (
        <div className="mt-3 flex items-center gap-3 text-sm text-slate-800" role="status" aria-live="polite">
          <Loader2 className="w-5 h-5 animate-spin text-sky-600 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-semibold truncate">{step}</p>
            <p className="text-xs text-slate-500">{seconds}s so far. You can leave this page; the video will still be replaced when it is ready.</p>
          </div>
        </div>
      )}
    </div>
  );
}
