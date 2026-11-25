import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Lightbulb, Maximize, Minimize, Volume2, VolumeX } from 'lucide-react';
import {
  WatchTracker, chapterAt, formatTime, hintFor, stopIndexAt, stopsOf,
  type IVAnswer, type IVCheckpoint, type IVContent, type IVProgress,
} from '../../lib/interactiveVideo';

export interface SavePayload { position: number; watched: [number, number][]; answers: Record<string, number> }

interface Props {
  content: IVContent;
  lessonId: string;
  initial: IVProgress | null;
  /** false for previews / not enrolled: the video still plays, nothing is saved. */
  tracking: boolean;
  onSave: (payload: SavePayload) => Promise<IVProgress | void>;
}

const SOUND_KEY = 'academy:video:sounds';

// Indoo's chirps in the browser: soft sine tones like the ones baked into the video (no noise).
function useChirp() {
  const [on, setOn] = useState(() => { try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; } });
  const ctx = useRef<AudioContext | null>(null);
  const chirp = useCallback((kind: 'curious' | 'happy' | 'oops') => {
    if (!on) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx.current = ctx.current || new AC();
      const shapes: Record<string, [number, number][]> = { curious: [[940, 0], [1300, 0.16], [900, 0.3]], happy: [[1000, 0], [1560, 0.17]], oops: [[900, 0], [440, 0.34]] };
      const pts = shapes[kind], c = ctx.current, o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime, end = pts[pts.length - 1][1] + 0.08;
      o.type = 'sine';
      pts.forEach(([f, t], i) => (i ? o.frequency.linearRampToValueAtTime(f, t0 + t) : o.frequency.setValueAtTime(f, t0)));
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.1, t0 + 0.015); g.gain.linearRampToValueAtTime(0.0001, t0 + end);
      o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + end + 0.02);
    } catch { /* audio is a nicety; never break the lesson */ }
  }, [on]);
  const toggle = () => setOn(v => { const n = !v; try { localStorage.setItem(SOUND_KEY, n ? 'on' : 'off'); } catch { /* private mode */ } return n; });
  return { on, chirp, toggle };
}

function IndooFace({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 34" className={className} aria-hidden="true">
      <rect x="3" y="9" width="28" height="18" rx="9" fill="#e8f0fa" stroke="#9fb3cc" />
      <rect x="7" y="13" width="20" height="10" rx="5" fill="#0b1220" />
      <circle cx="13" cy="18" r="2.6" fill="#8fe3ff" /><circle cx="21" cy="18" r="2.6" fill="#8fe3ff" />
    </svg>
  );
}

export function InteractiveVideoPlayer({ content, lessonId, initial, tracking, onSave }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const tracker = useRef(new WatchTracker(initial?.watched || []));
  const lastT = useRef(0);
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const answersRef = useRef<Record<string, IVAnswer>>(initial?.answers || {});
  const resumedRef = useRef(false);

  const [progress, setProgress] = useState<IVProgress | null>(initial);
  const [answers, setAnswers] = useState<Record<string, IVAnswer>>(initial?.answers || {});
  const [now, setNow] = useState(0);
  const [quiz, setQuiz] = useState<{ cp: IVCheckpoint; resume: boolean } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [resumedAt, setResumedAt] = useState<number | null>(null);
  const { on: soundsOn, chirp, toggle: toggleSounds } = useChirp();

  const stops = useMemo(() => stopsOf(content), [content]);
  const stopIdx = stopIndexAt(stops, now);
  const unanswered = content.checkpoints.filter(cp => !answers[cp.sceneId]);

  const save = useCallback(async () => {
    if (!tracking) return;
    if (savingRef.current) { pendingRef.current = true; return; }
    savingRef.current = true;
    try {
      const v = videoRef.current;
      const choices = Object.fromEntries(Object.entries(answersRef.current).map(([k, a]) => [k, a.choice]));
      const next = await onSave({ position: v?.currentTime ?? lastT.current, watched: tracker.current.snapshot(), answers: choices });
      if (next) setProgress(next);
    } catch { /* offline or rejected: the next save carries everything again */ }
    finally {
      savingRef.current = false;
      if (pendingRef.current) { pendingRef.current = false; void save(); }
    }
  }, [onSave, tracking]);

  // Keep the lesson's progress (and the Mark Complete gate) in step with what the server confirmed.
  useEffect(() => { if (initial) setProgress(initial); }, [initial]);

  useEffect(() => { if (resumedAt === null) return; const t = window.setTimeout(() => setResumedAt(null), 7000); return () => clearTimeout(t); }, [resumedAt]);

  // Resume where the student left off.
  const onLoaded = () => {
    const v = videoRef.current;
    const p = initial?.position ?? 0;
    if (!v || resumedRef.current || p < 3 || p > content.duration - 4) return;
    resumedRef.current = true;
    v.currentTime = p;
    setResumedAt(p);
  };

  // Watch tracking, question pauses, and the periodic save.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tickMs = 200;
    const id = window.setInterval(() => {
      const t = v.currentTime, playing = !v.paused && !v.seeking && !v.ended;
      tracker.current.tick(t, playing);
      setNow(t);
      if (playing && !quiz) {
        for (const cp of content.checkpoints) {
          if (!answersRef.current[cp.sceneId] && lastT.current < cp.pauseAt && t >= cp.pauseAt && t - cp.pauseAt < 1.5) { v.pause(); setQuiz({ cp, resume: true }); break; }
        }
      }
      lastT.current = t;
    }, tickMs);
    const saveId = window.setInterval(() => { if (!v.paused) void save(); }, 10000);
    const flush = () => { tracker.current.tick(v.currentTime, false); void save(); };
    v.addEventListener('pause', flush); v.addEventListener('ended', flush);
    window.addEventListener('pagehide', flush);
    return () => { clearInterval(id); clearInterval(saveId); v.removeEventListener('pause', flush); v.removeEventListener('ended', flush); window.removeEventListener('pagehide', flush); flush(); };
  }, [content, quiz, save]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === boxRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const jump = (t: number) => { const v = videoRef.current; if (!v) return; v.currentTime = t; setHint(null); void v.play().catch(() => undefined); };
  const askIndoo = () => { setHint(hintFor(chapterAt(content.chapters, videoRef.current?.currentTime ?? 0))); chirp('curious'); };
  const answer = (cp: IVCheckpoint, choice: number) => {
    if (answersRef.current[cp.sceneId]) return;
    const a: IVAnswer = { choice, correct: choice === cp.answer };
    answersRef.current = { ...answersRef.current, [cp.sceneId]: a };
    setAnswers(answersRef.current);
    chirp(a.correct ? 'happy' : 'oops');
    void save();
  };
  const closeQuiz = () => { const resume = quiz?.resume; setQuiz(null); if (resume) void videoRef.current?.play().catch(() => undefined); };
  const toggleFullscreen = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void boxRef.current?.requestFullscreen(); };

  const watchedPct = Math.round(Math.min(1, Math.max(progress?.watchedFraction ?? 0, tracker.current.seconds() / content.duration)) * 100);
  const quizAnswer = quiz ? answers[quiz.cp.sceneId] : undefined;
  const quizRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (quiz) quizRef.current?.focus(); }, [quiz]);

  return (
    <div ref={boxRef} className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg">
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef} src={content.src} controls playsInline preload="metadata" className="w-full h-full"
          onLoadedMetadata={onLoaded} aria-label={content.title}
        />
        {resumedAt !== null && !quiz && (
          <button onClick={() => { jump(0); setResumedAt(null); }} className="absolute top-3 left-3 text-xs font-bold bg-black/70 text-white rounded-full px-3 py-1.5 hover:bg-black/85">
            Resumed at {formatTime(resumedAt)}. Start over
          </button>
        )}
        {hint && !quiz && (
          <div role="status" className="absolute left-3 bottom-16 max-w-[min(26rem,85%)] bg-white text-slate-800 rounded-2xl shadow-xl p-3 flex gap-3 items-start text-sm">
            <IndooFace className="w-9 h-9 shrink-0" />
            <div className="min-w-0"><p className="text-[11px] font-black uppercase tracking-wide text-indigo-600 mb-0.5">Indoo says</p>{hint}</div>
            <button onClick={() => setHint(null)} aria-label="Close hint" className="text-slate-400 hover:text-slate-700 text-xl leading-none min-h-[32px] min-w-[32px] -mt-1 -mr-1">×</button>
          </div>
        )}
        {quiz && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center p-4 sm:p-6 overflow-auto" role="dialog" aria-modal="true" aria-labelledby="iv-q">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 w-full max-w-lg shadow-2xl">
              <p className="text-xs font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mb-1">Quick check</p>
              <p id="iv-q" className="text-lg font-bold text-slate-900 dark:text-white mb-4">{quiz.cp.question}</p>
              <div className="space-y-2" role="group" aria-label="Answer options">
                {quiz.cp.options.map((opt, i) => {
                  const picked = quizAnswer?.choice === i, right = !!quizAnswer && i === quiz.cp.answer;
                  const state = !quizAnswer ? 'border-slate-200 dark:border-slate-700 hover:border-indigo-400' : right ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : picked ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30' : 'border-slate-200 dark:border-slate-700 opacity-60';
                  return (
                    <button key={i} ref={i === 0 ? quizRef : undefined} disabled={!!quizAnswer} onClick={() => answer(quiz.cp, i)}
                      className={`w-full text-left flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 transition-colors ${state}`}>
                      <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-sm font-bold text-white ${right ? 'bg-emerald-600' : picked ? 'bg-rose-600' : 'bg-indigo-600'}`}>{'ABCDEF'[i]}</span>
                      <span className="text-slate-800 dark:text-slate-100">{opt}</span>
                    </button>
                  );
                })}
              </div>
              {quizAnswer && (
                <div className="mt-4" aria-live="polite">
                  <p className={`text-sm font-bold ${quizAnswer.correct ? 'text-emerald-600' : 'text-rose-600'}`}>{quizAnswer.correct ? 'Correct.' : 'Not quite. The right answer is highlighted.'}</p>
                  {quiz.cp.explanation && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{quiz.cp.explanation}</p>}
                  <button onClick={closeQuiz} className="mt-3 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm">Continue</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        <nav aria-label="Campus map">
          <ol className="flex items-start overflow-x-auto scrollbar-none pb-1">
            {stops.map((s, i) => {
              const done = i < stopIdx, on = i === stopIdx;
              return (
                <li key={`${s.station}-${s.start}`} className="flex-1 min-w-[56px] sm:min-w-[88px] relative text-center">
                  {i > 0 && <span aria-hidden="true" className={`absolute top-[13px] right-1/2 w-full h-1 ${done || on ? 'bg-indigo-600' : 'bg-indigo-100 dark:bg-slate-700'}`} />}
                  <button onClick={() => jump(s.start)} aria-current={on ? 'step' : undefined} aria-label={`Jump to ${s.name}`} className="relative z-10 group w-full focus:outline-none">
                    <span className={`block mx-auto w-[30px] h-[30px] rounded-full border-[3px] border-indigo-600 transition-shadow ${done ? 'bg-indigo-600' : 'bg-white dark:bg-slate-900'} ${on ? 'ring-4 ring-indigo-200 dark:ring-indigo-900' : ''} group-focus-visible:ring-4 group-focus-visible:ring-indigo-400`} />
                    <span className={`block mt-1.5 text-[11px] sm:text-xs leading-tight px-0.5 sm:px-1 break-words ${on ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{s.name}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={askIndoo} className="inline-flex items-center gap-2 px-3 min-h-[44px] rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-sm font-bold">
            <Lightbulb className="w-4 h-4" /> Ask Indoo for a hint
          </button>
          <button onClick={toggleSounds} aria-pressed={soundsOn} className="inline-flex items-center gap-2 px-3 min-h-[44px] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold">
            {soundsOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />} Hint sounds {soundsOn ? 'on' : 'off'}
          </button>
          <button onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'} className="ml-auto min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>

        <div className="text-sm text-slate-600 dark:text-slate-400" aria-live="polite" data-lesson-id={lessonId}>
          {progress?.completed ? (
            <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-4 h-4" /> Video complete</span>
          ) : tracking ? (
            <span>Watched {watchedPct}% (finish at least 90%{content.checkpoints.length ? ' and answer the questions' : ''} to complete this video).</span>
          ) : (
            <span>Progress is not saved while previewing.</span>
          )}
          {!progress?.completed && unanswered.length > 0 && (
            <span className="ml-2">
              {unanswered.length} question{unanswered.length > 1 ? 's' : ''} left{' '}
              <button onClick={() => { videoRef.current?.pause(); setQuiz({ cp: unanswered[0], resume: false }); }} className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Answer now</button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
