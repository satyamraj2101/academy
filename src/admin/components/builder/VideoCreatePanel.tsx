import { useCallback, useEffect, useState } from 'react';
import { Clapperboard, Loader2, TriangleAlert } from 'lucide-react';
import { adminFetch } from '../../hooks/useD1Query';
import { toast } from '../../../lib/toast';

interface Job { id: string; status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled'; progress?: { step?: string } | null; result?: { published?: { videoId?: string } } | null; error?: string | null }

interface Props {
  courseId: string;
  lessonId: string;
  /** Called with the new video's data once it is live, so the editor shows it and a later Save keeps it. */
  onCreated: (videoJson: string) => void;
}

const POLL_MS = 4000;

/** "This lesson has no video yet": the AI writes the script from the saved lesson text, the cloud renders it and attaches it. */
export function VideoCreatePanel({ courseId, lessonId, onCreated }: Props) {
  const [note, setNote] = useState('');
  const [job, setJob] = useState<Job | null>(null);
  const [sending, setSending] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const active = !!job && (job.status === 'queued' || job.status === 'running');

  const finish = useCallback(async (j: Job) => {
    if (j.status === 'failed') { toast.error('The video was not made', j.error || 'Something went wrong.'); return; }
    try {
      const res = await adminFetch(`/academy/courses/${encodeURIComponent(courseId)}/structure`) as any;
      const newId = j.result?.published?.videoId;
      for (const m of res.structure || []) {
        const lesson = (m.lessons || []).find((l: any) => l.id === lessonId);
        const sec = (lesson?.sections || []).find((s: any) => { if (s.section_type !== 'interactive_video') return false; try { return JSON.parse(s.content).videoId === newId; } catch { return false; } });
        if (sec) { onCreated(sec.content); toast.success('Video created', 'It is now part of this lesson.'); return; }
      }
      toast.error('The video was made but could not be shown here', 'Reload the lesson to see it.');
    } catch (e: any) {
      toast.error('The video was made but could not be shown here', e.message || 'Reload the lesson to see it.');
    }
  }, [courseId, lessonId, onCreated]);

  // Pick up a job that is already running for this lesson (for example after a reload).
  useEffect(() => {
    let alive = true;
    adminFetch(`/academy/ai-jobs?lessonId=${encodeURIComponent(lessonId)}`).then((rows: any) => {
      const latest = (rows as Job[])?.[0];
      if (alive && latest && (latest.status === 'queued' || latest.status === 'running')) setJob(latest);
    }).catch(() => { /* nothing running */ });
    return () => { alive = false; };
  }, [lessonId]);

  useEffect(() => {
    if (!active || !job) return;
    const t0 = Date.now();
    const tick = window.setInterval(() => setSeconds(Math.round((Date.now() - t0) / 1000)), 1000);
    const poll = window.setInterval(async () => {
      try {
        const j = await adminFetch(`/academy/ai-jobs?id=${encodeURIComponent(job.id)}`) as Job;
        setJob(j);
        if (j.status === 'done' || j.status === 'failed') void finish(j);
      } catch { /* the next poll catches up */ }
    }, POLL_MS);
    return () => { clearInterval(tick); clearInterval(poll); setSeconds(0); };
  }, [active, job?.id, finish]);

  const start = async () => {
    setSending(true);
    try {
      const res = await adminFetch('/academy/ai-jobs', { method: 'POST', body: JSON.stringify({ type: 'lesson_video_edit', payload: { courseId, lessonId, create: true, instruction: note.trim() } }) }) as { id: string; started?: boolean };
      setJob({ id: res.id, status: 'queued', progress: { step: res.started ? 'Starting the cloud worker' : 'Waiting for the cloud worker' } });
      setNote('');
    } catch (e: any) {
      toast.error('Could not start', e.message || 'Try again in a moment.');
    } finally { setSending(false); }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900"><Clapperboard className="w-4 h-4" aria-hidden="true" /> This lesson has no video yet</p>
      <p className="mt-0.5 text-xs text-slate-600">The AI turns the saved lesson text into a short video with Soomy and Indoo, including a question to check understanding. It takes about 2 to 5 minutes. Click Save Content first if you edited the text.</p>
      {active ? (
        <div className="mt-3 flex items-center gap-3 text-sm text-slate-800" role="status" aria-live="polite">
          <Loader2 className="w-5 h-5 animate-spin text-slate-500 shrink-0" aria-hidden="true" />
          <div className="min-w-0"><p className="font-medium truncate">{job?.progress?.step || 'Working'}</p><p className="text-xs text-slate-500">{seconds}s so far. You can leave this page; the video will be added when it is ready.</p></div>
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <input
              value={note} onChange={e => setNote(e.target.value)} maxLength={1500} aria-label="Optional note for the video"
              placeholder="Optional: what the video should focus on"
              className="flex-1 min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-600"
            />
            <button type="button" onClick={start} disabled={sending} className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null} Create video
            </button>
          </div>
          {job?.status === 'failed' && <p className="mt-2 flex items-start gap-1.5 text-xs text-rose-700" role="alert"><TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" /> The last try failed: {job.error || 'Something went wrong.'}</p>}
        </>
      )}
    </div>
  );
}
