import { useEffect, useState, type RefObject } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { activeStepAt, buildPath, doneCount, type StepId } from '../../lib/lessonPath';

interface Props {
  /** The lesson's scrolling container. */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Changes with the lesson, so the path starts fresh for each one. */
  lessonKey: string;
  hasWatch: boolean; watchDone: boolean;
  hasRead: boolean;
  hasCheck: boolean; checkDone: boolean;
}

const anchor = (id: StepId) => document.getElementById(`lesson-${id}`);

/** Where "Watch", "Read" and "Check" are on the page. Sticks to the top while the lesson scrolls. */
export function LessonPath({ scrollRef, lessonKey, hasWatch, watchDone, hasRead, hasCheck, checkDone }: Props) {
  const [active, setActive] = useState<StepId | null>(null);
  const [readViewed, setReadViewed] = useState(false);

  useEffect(() => { setActive(null); setReadViewed(false); }, [lessonKey]);

  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const top = box.getBoundingClientRect().top;
      const tops: Partial<Record<StepId, number>> = {};
      (['watch', 'read', 'check'] as StepId[]).forEach(id => { const el = anchor(id); if (el) tops[id] = el.getBoundingClientRect().top - top; });
      const scrollable = box.scrollHeight > box.clientHeight + 8;
      // A step is "current" once its top is in the upper part of the window, where the eye is.
      setActive(activeStepAt(tops, Math.max(140, box.clientHeight * 0.4), scrollable && box.scrollTop + box.clientHeight >= box.scrollHeight - 8));
      // "Read" counts once the end of the notes has been on screen.
      const read = anchor('read');
      if (read && read.getBoundingClientRect().bottom - top <= box.clientHeight + 24) setReadViewed(true);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(measure); };
    box.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const late = window.setTimeout(schedule, 500); // the video and diagrams change the page height after first paint
    schedule();
    return () => { box.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); clearTimeout(late); if (raf) cancelAnimationFrame(raf); };
  }, [scrollRef, lessonKey, hasWatch, hasRead, hasCheck]);

  const steps = buildPath({ hasWatch, watchDone, hasRead, readViewed, hasCheck, checkDone }, active);
  if (!steps.length) return null;

  return (
    <nav aria-label="Lesson steps" className="sticky top-0 z-10 -mx-6 px-6 lg:-mx-12 lg:px-12 2xl:-mx-16 2xl:px-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
      <ol className="flex items-center overflow-x-auto scrollbar-none">
        {steps.map((s, i) => (
          <li key={s.id} className="flex items-center shrink-0">
            {i > 0 && <span aria-hidden="true" className="mx-1 h-px w-5 sm:w-10 bg-slate-300 dark:bg-slate-700" />}
            <button
              onClick={() => anchor(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              aria-current={s.state === 'current' ? 'step' : undefined}
              className={`inline-flex items-center gap-2 min-h-[48px] px-2 sm:px-3 rounded-lg text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-900 ${s.state === 'current' ? 'font-medium text-slate-900 dark:text-white' : s.state === 'done' ? 'font-semibold text-slate-700 dark:text-slate-300' : 'font-semibold text-slate-600 dark:text-slate-400'}`}
            >
              {s.state === 'done' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              ) : (
                <span aria-hidden="true" className={`grid place-items-center w-5 h-5 rounded-full border ${s.state === 'current' ? 'border-indigo-600 dark:border-indigo-400' : 'border-slate-300 dark:border-slate-600'}`}>
                  {s.state === 'current' && <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />}
                </span>
              )}
              {s.label}
              <span className="sr-only">{s.state === 'done' ? ', done' : s.state === 'current' ? ', current step' : ''}</span>
            </button>
          </li>
        ))}
        <li className="ml-auto pl-3 shrink-0 hidden sm:block text-xs font-semibold text-slate-600 dark:text-slate-400" aria-live="polite">
          {doneCount(steps)} of {steps.length} done
        </li>
      </ol>
    </nav>
  );
}
