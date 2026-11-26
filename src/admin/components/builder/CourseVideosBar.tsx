import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clapperboard, Loader2 } from 'lucide-react';
import { adminFetch } from '../../hooks/useD1Query';
import { toast } from '../../../lib/toast';

interface LessonLite { id: string; title: string; sections?: { section_type: string; content: string }[] }
interface ModuleLite { lessons?: LessonLite[] }
interface Row { id: string; status: string; lesson_id: string; error?: string | null; created_at: string; progress?: { step?: string } | null }

export const MIN_TEXT = 120; // the video script needs this much lesson text to work from

/** Lessons that have no video and enough saved text to make one from. */
export function lessonsNeedingVideo(modules: ModuleLite[]): { ready: LessonLite[]; noText: LessonLite[] } {
  const ready: LessonLite[] = [], noText: LessonLite[] = [];
  for (const m of modules) for (const l of m.lessons || []) {
    const secs = l.sections || [];
    if (secs.some(s => s.section_type === 'interactive_video')) continue;
    const chars = secs.filter(s => s.section_type === 'markdown').reduce((n, s) => n + (s.content || '').replace(/\s+/g, ' ').trim().length, 0);
    (chars >= MIN_TEXT ? ready : noText).push(l);
  }
  return { ready, noText };
}

/** Latest job per lesson among those started for this batch. */
export function summarise(rows: Row[], ids: string[], since: number) {
  const latest = new Map<string, Row>();
  for (const r of rows) {
    if (!ids.includes(r.lesson_id) || Date.parse(r.created_at) < since) continue;
    const have = latest.get(r.lesson_id);
    if (!have || r.created_at > have.created_at) latest.set(r.lesson_id, r);
  }
  const all = [...latest.values()];
  const count = (st: string[]) => all.filter(r => st.includes(r.status)).length;
  return { total: ids.length, done: count(['done']), failed: count(['failed', 'cancelled']), running: count(['running']), queued: count(['queued']) + (ids.length - all.length), failures: all.filter(r => r.status === 'failed') };
}

/** "Create all missing videos" for a course, with one progress line. */
export function CourseVideosBar({ courseId, modules, onDone }: { courseId: string; modules: ModuleLite[]; onDone: () => void }) {
  const { ready, noText } = useMemo(() => lessonsNeedingVideo(modules), [modules]);
  const [batch, setBatch] = useState<{ ids: string[]; since: number } | null>(null);
  const [starting, setStarting] = useState(false);
  const [stats, setStats] = useState<ReturnType<typeof summarise> | null>(null);
  const finished = useRef(false);
  const active = !!batch && !!stats && stats.running + stats.queued > 0;

  const poll = useCallback(async () => {
    if (!batch) return;
    try {
      const rows = await adminFetch(`/academy/ai-jobs?courseId=${encodeURIComponent(courseId)}`) as Row[];
      const s = summarise(rows, batch.ids, batch.since);
      setStats(s);
      if (s.running + s.queued === 0 && !finished.current) {
        finished.current = true;
        if (s.failed) toast.error(`${s.done} of ${s.total} videos made`, `${s.failed} failed. ${s.failures[0]?.error || ''}`.trim());
        else toast.success(`${s.done} video${s.done === 1 ? '' : 's'} made`);
        onDone();
      }
    } catch { /* the next poll catches up */ }
  }, [batch, courseId, onDone]);

  useEffect(() => {
    if (!batch) return;
    void poll();
    const t = window.setInterval(() => { if (!finished.current) void poll(); }, 5000);
    return () => clearInterval(t);
  }, [batch, poll]);

  const start = async () => {
    setStarting(true);
    const since = Date.now() - 5000, ids: string[] = [];
    let skipped = 0;
    for (const l of ready) {
      try {
        await adminFetch('/academy/ai-jobs', { method: 'POST', body: JSON.stringify({ type: 'lesson_video_edit', payload: { courseId, lessonId: l.id, create: true, instruction: '' } }) });
        ids.push(l.id);
      } catch { skipped++; } // already being made, or already has one
    }
    setStarting(false);
    if (skipped) toast.error(`${skipped} lesson${skipped === 1 ? ' was' : 's were'} skipped`, 'A video is already being made or exists.');
    if (ids.length) { finished.current = false; setStats(null); setBatch({ ids, since }); }
  };

  if (!ready.length && !batch && !noText.length) return null;
  const pct = stats ? Math.round(((stats.done + stats.failed) / Math.max(1, stats.total)) * 100) : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4 flex flex-wrap items-center gap-3 justify-between" aria-live="polite">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-900"><Clapperboard className="w-4 h-4" aria-hidden="true" />
          {active ? `Making ${stats!.total} video${stats!.total === 1 ? '' : 's'}` : ready.length ? `${ready.length} lesson${ready.length === 1 ? ' has' : 's have'} no video` : 'Videos'}
        </p>
        <p className="mt-0.5 text-xs text-slate-600">
          {active
            ? `${stats!.done} done, ${stats!.running + stats!.queued} to go${stats!.failed ? `, ${stats!.failed} failed` : ''}. You can keep working; this updates by itself.`
            : batch && stats
              ? `${stats.done} of ${stats.total} made${stats.failed ? `, ${stats.failed} failed` : ''}.`
              : `The AI writes each from the saved lesson text${noText.length ? `. ${noText.length} lesson${noText.length === 1 ? ' has' : 's have'} too little text and will be skipped` : ''}.`}
        </p>
        {active && <div className="mt-2 h-1.5 w-56 max-w-full rounded-full bg-slate-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Videos made"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${pct}%` }} /></div>}
      </div>
      {!active && ready.length > 0 && (
        <button type="button" onClick={start} disabled={starting} className="min-h-[44px] inline-flex items-center gap-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50">
          {starting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null} Create {ready.length} video{ready.length === 1 ? '' : 's'}
        </button>
      )}
    </div>
  );
}
