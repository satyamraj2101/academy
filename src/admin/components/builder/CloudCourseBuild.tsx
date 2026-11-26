import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Circle, Loader2 } from 'lucide-react';
import { adminFetch } from '../../hooks/useD1Query';
import { toast } from '../../../lib/toast';
import { lessonsNeedingVideo, summarise } from './CourseVideosBar';

interface CourseJob { id: string; type: string; status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled'; progress?: { step?: string; done?: number; total?: number; course_id?: string } | null; result?: { course_id?: string; title?: string; lessons?: number } | null; error?: string | null; created_at?: string }

const mins = (s: number) => (s < 90 ? `${s}s` : `${Math.round(s / 60)} min`);
const KIND: Record<string, string> = { course_from_prompt: 'From a topic', course_from_document: 'From a document', course_from_transcript: 'From a transcript' };

/** Progress of one cloud course build: the course is written, then (optionally) every lesson gets its video. */
export function CloudCourseBuild({ jobId, withVideos, onBack }: { jobId: string; withVideos: boolean; onBack: () => void }) {
  const [job, setJob] = useState<CourseJob | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [batch, setBatch] = useState<{ ids: string[]; since: number; skipped: number } | null>(null);
  const [videoStats, setVideoStats] = useState<ReturnType<typeof summarise> | null>(null);
  const startedVideos = useRef(false);
  const t0 = useRef(Date.now());

  const courseId = job?.result?.course_id || job?.progress?.course_id;
  const writing = !job || job.status === 'queued' || job.status === 'running';

  useEffect(() => {
    const tick = window.setInterval(() => setSeconds(Math.round((Date.now() - t0.current) / 1000)), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!writing && job) return;
    const poll = async () => { try { setJob(await adminFetch(`/academy/ai-jobs?id=${encodeURIComponent(jobId)}`) as CourseJob); } catch { /* next poll */ } };
    void poll();
    const t = window.setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [jobId, writing, job?.status]);

  const startVideos = useCallback(async (id: string) => {
    startedVideos.current = true;
    const since = Date.now() - 5000, ids: string[] = [];
    let skipped = 0;
    try {
      const res = await adminFetch(`/academy/courses/${encodeURIComponent(id)}/structure`) as { structure: any[] };
      const { ready, noText } = lessonsNeedingVideo(res.structure || []);
      skipped = noText.length;
      for (const l of ready) {
        try { await adminFetch('/academy/ai-jobs', { method: 'POST', body: JSON.stringify({ type: 'lesson_video_edit', payload: { courseId: id, lessonId: l.id, create: true, instruction: '' } }) }); ids.push(l.id); } catch { skipped++; }
      }
    } catch (e: any) { toast.error('Could not start the videos', e.message); }
    setBatch({ ids, since, skipped });
  }, []);

  useEffect(() => {
    if (job?.status === 'done' && withVideos && courseId && !startedVideos.current) void startVideos(courseId);
  }, [job?.status, withVideos, courseId, startVideos]);

  useEffect(() => {
    if (!batch || !courseId || !batch.ids.length) return;
    let stop = false;
    const poll = async () => {
      try {
        const rows = await adminFetch(`/academy/ai-jobs?courseId=${encodeURIComponent(courseId)}`) as any[];
        const s = summarise(rows, batch.ids, batch.since);
        if (!stop) setVideoStats(s);
        if (s.running + s.queued === 0) stop = true;
      } catch { /* next poll */ }
    };
    void poll();
    const t = window.setInterval(() => { if (!stop) void poll(); }, 5000);
    return () => clearInterval(t);
  }, [batch, courseId]);

  const failed = job?.status === 'failed' || job?.status === 'cancelled';
  const courseDone = job?.status === 'done';
  const videosActive = withVideos && courseDone && (!batch || (batch.ids.length > 0 && (!videoStats || videoStats.running + videoStats.queued > 0)));
  const allDone = courseDone && !videosActive;
  const lessons = job?.progress?.total || 0, written = job?.progress?.done || 0;

  const Row = ({ state, title, children }: { state: 'done' | 'active' | 'todo' | 'failed'; title: string; children?: React.ReactNode }) => (
    <li className="flex gap-3 py-3">
      {state === 'done' ? <Check className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" aria-label="Done" />
        : state === 'active' ? <Loader2 className="w-4 h-4 mt-0.5 animate-spin text-slate-500 shrink-0" aria-label="In progress" />
        : state === 'failed' ? <Circle className="w-4 h-4 mt-0.5 text-rose-500 shrink-0" aria-label="Failed" />
        : <Circle className="w-4 h-4 mt-0.5 text-slate-300 shrink-0" aria-label="Waiting" />}
      <div className="min-w-0"><p className="text-sm font-medium text-slate-900">{title}</p><div className="text-xs text-slate-600">{children}</div></div>
    </li>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-slate-900">{allDone ? 'The course is ready' : failed ? 'The build stopped' : 'Building your course in the cloud'}</h2>
          <p className="text-xs text-slate-500">{allDone ? 'It is saved as a draft. Review it before publishing.' : 'You can leave this page. The work continues, and the course shows up in your course list when it is created.'}</p>
        </div>
        {!allDone && <span className="font-mono text-xs text-slate-500 shrink-0">{mins(seconds)}</span>}
      </div>

      <ul className="divide-y divide-slate-100 border-y border-slate-100">
        <Row state={failed ? 'failed' : courseDone ? 'done' : 'active'} title="Writing the course">
          {failed ? <span className="text-rose-700">{job?.error || 'The AI could not finish. Try again in a few minutes.'}</span>
            : courseDone ? `${job?.result?.lessons ?? lessons} lessons, quizzes and assignments written${job?.result?.title ? `: ${job.result.title}` : ''}.`
            : <>{job?.progress?.step || 'Waiting for the cloud worker'}{lessons ? ` (${written} of ${lessons} lessons)` : ''}</>}
          {!courseDone && !failed && lessons > 0 && <div className="mt-2 h-1.5 w-56 max-w-full rounded-full bg-slate-200" role="progressbar" aria-valuenow={Math.round((written / lessons) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Lessons written"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${Math.round((written / lessons) * 100)}%` }} /></div>}
        </Row>
        {withVideos && (
          <Row state={!courseDone ? 'todo' : videosActive ? 'active' : videoStats?.failed ? 'failed' : 'done'} title="Making a video for each lesson">
            {!courseDone ? 'Starts when the course is written.'
              : !batch ? 'Starting.'
              : !batch.ids.length ? 'No lesson has enough text for a video yet.'
              : videoStats ? `${videoStats.done} of ${videoStats.total} made${videoStats.failed ? `, ${videoStats.failed} failed` : ''}${batch.skipped ? `, ${batch.skipped} skipped (too little text)` : ''}.` : 'Starting.'}
          </Row>
        )}
      </ul>

      <div className="flex flex-wrap gap-2 justify-between">
        <button type="button" onClick={onBack} className="min-h-[40px] inline-flex items-center gap-2 px-3 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to the wizard</button>
        {courseId && (courseDone || (job?.progress?.course_id && !failed)) && (
          <a href={`/admin/academy/courses/${courseId}`} className="min-h-[40px] inline-flex items-center px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium">{allDone ? 'Open the course' : 'Open the draft so far'}</a>
        )}
      </div>
    </div>
  );
}

/** The latest cloud builds, so one that was started earlier can be found again. */
export function RecentBuilds({ onOpen }: { onOpen: (id: string) => void }) {
  const [jobs, setJobs] = useState<CourseJob[] | null>(null);
  useEffect(() => {
    adminFetch('/academy/ai-jobs').then(rows => setJobs((rows as CourseJob[]).filter(j => j.type.startsWith('course_from_')).slice(0, 5))).catch(() => setJobs([]));
  }, []);
  if (!jobs || jobs.length === 0) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
      <h2 className="text-sm font-medium text-slate-900">Recent cloud builds</h2>
      <ul className="mt-2 divide-y divide-slate-100">
        {jobs.map(j => (
          <li key={j.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="text-slate-800 truncate">{j.result?.title || KIND[j.type] || 'Course'}</p>
              <p className="text-xs text-slate-500">{j.created_at ? new Date(j.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''} · {j.status === 'done' ? 'ready' : j.status === 'failed' ? 'stopped' : j.progress?.step || j.status}</p>
            </div>
            <button type="button" onClick={() => onOpen(j.id)} className="min-h-[36px] px-3 text-xs font-medium text-indigo-700 hover:text-indigo-900 shrink-0">{j.status === 'done' ? 'Details' : 'Follow'}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
