import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bird, Check, CheckCircle2, Maximize, MapPin, Minimize, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import {
  SPEEDS, WatchTracker, chapterAt, clamp, formatSpeed, formatTime, hintFor, pct, skipTo, stopIndexAt, stopsOf, timeAtPointer,
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
/** Other parts of the lesson page ask the player to open its next unanswered question with this event. */
export const OPEN_VIDEO_QUESTION = 'academy:open-video-question';

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

/** One line of the "To finish this video" checklist. */
function Requirement({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${done ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
      {done
        ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        : <span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-400 dark:border-slate-500" />}
      {label}
      <span className="sr-only">{done ? ', done' : ', not done yet'}</span>
    </span>
  );
}

// Control bar buttons: 44px targets, a focus ring that shows on the dark bar.
const BAR_BTN = 'inline-flex items-center justify-center h-11 min-w-[44px] px-2 rounded-lg text-white hover:bg-white/15 focus-visible:outline-sky-300 transition-colors';

export function InteractiveVideoPlayer({ content, lessonId, initial, tracking, onSave }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
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
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [hoverT, setHoverT] = useState<number | null>(null);
  const { on: soundsOn, chirp, toggle: toggleSounds } = useChirp();

  const dur = content.duration;
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
    setNow(p);
    setResumedAt(p);
  };

  // Watch tracking, question pauses, and the periodic save.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tickMs = 200;
    const id = window.setInterval(() => {
      const t = v.currentTime, isPlaying = !v.paused && !v.seeking && !v.ended;
      tracker.current.tick(t, isPlaying);
      setNow(t);
      if (isPlaying && !quiz) {
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
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // The speed menu closes on any press outside it, and on Escape.
  useEffect(() => {
    if (!speedOpen) return;
    const close = (e: Event) => { if (!(e.target as HTMLElement).closest?.('[data-speed-menu]')) setSpeedOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setSpeedOpen(false); };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [speedOpen]);

  const jump = (t: number) => { const v = videoRef.current; if (!v) return; v.currentTime = t; setNow(t); setHint(null); void v.play().catch(() => undefined); };
  const seek = (t: number) => { const v = videoRef.current; if (!v) return; v.currentTime = clamp(t, 0, dur); setNow(v.currentTime); };
  const skip = (d: number) => seek(skipTo(videoRef.current?.currentTime ?? now, d, dur));
  const togglePlay = () => { const v = videoRef.current; if (!v) return; if (v.paused || v.ended) void v.play().catch(() => undefined); else v.pause(); };
  const toggleMute = () => { const v = videoRef.current; if (v) v.muted = !v.muted; };
  const setSpeed = (r: number) => { const v = videoRef.current; if (v) v.playbackRate = r; setSpeedOpen(false); };
  const toggleFullscreen = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void stageRef.current?.requestFullscreen(); };
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
  const openNextQuestion = useCallback(() => {
    const next = content.checkpoints.find(cp => !answersRef.current[cp.sceneId]);
    if (!next) return;
    videoRef.current?.pause();
    setQuiz({ cp: next, resume: false });
  }, [content.checkpoints]);

  // "Answer in the video" in the lesson's Check step lands here.
  useEffect(() => {
    const on = (e: Event) => { if ((e as CustomEvent).detail?.lessonId === lessonId) openNextQuestion(); };
    window.addEventListener(OPEN_VIDEO_QUESTION, on);
    return () => window.removeEventListener(OPEN_VIDEO_QUESTION, on);
  }, [lessonId, openNextQuestion]);

  // Keyboard: only while the picture itself has focus, so it never fights typing or buttons.
  const onStageKey = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t !== e.currentTarget && t.tagName !== 'VIDEO') return;
    const k = e.key.toLowerCase();
    let handled = true;
    if (k === ' ' || k === 'k') togglePlay();
    else if (k === 'arrowleft') skip(-5);
    else if (k === 'arrowright') skip(5);
    else if (k === 'j') skip(-10);
    else if (k === 'l') skip(10);
    else if (k === 'm') toggleMute();
    else if (k === 'f') toggleFullscreen();
    else handled = false;
    if (handled) { e.preventDefault(); e.stopPropagation(); }
  };

  // Scrubber: press or drag anywhere on the track; arrow keys when it has focus.
  const timeFromPointer = (e: React.PointerEvent) => {
    const r = trackRef.current?.getBoundingClientRect();
    return r ? timeAtPointer(e.clientX, r.left, r.width, dur) : 0;
  };
  const onTrackDown = (e: React.PointerEvent) => { draggingRef.current = true; e.currentTarget.setPointerCapture(e.pointerId); const t = timeFromPointer(e); seek(t); setHoverT(t); };
  const onTrackMove = (e: React.PointerEvent) => { const t = timeFromPointer(e); setHoverT(t); if (draggingRef.current) seek(t); };
  const onTrackUp = () => { draggingRef.current = false; };
  const onTrackKey = (e: React.KeyboardEvent) => {
    let handled = true;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') skip(-5);
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') skip(5);
    else if (e.key === 'PageDown') skip(-30);
    else if (e.key === 'PageUp') skip(30);
    else if (e.key === 'Home') seek(0);
    else if (e.key === 'End') seek(dur);
    else handled = false;
    if (handled) { e.preventDefault(); e.stopPropagation(); }
  };

  const watchedPct = Math.round(Math.min(1, Math.max(progress?.watchedFraction ?? 0, tracker.current.seconds() / content.duration)) * 100);
  const quizAnswer = quiz ? answers[quiz.cp.sceneId] : undefined;
  const quizRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (quiz) quizRef.current?.focus(); }, [quiz]);

  const watchedRanges = tracker.current.snapshot();
  const here = chapterAt(content.chapters, now);

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div
        ref={stageRef} data-video-stage role="group" tabIndex={0} onKeyDown={onStageKey} aria-label={`${content.title}. Press space to play or pause.`}
        aria-keyshortcuts="Space K ArrowLeft ArrowRight J L M F"
        className={`bg-black outline-offset-[-3px] ${fullscreen ? 'flex flex-col h-full w-full' : ''}`}
      >
        <div className={`relative bg-black ${fullscreen ? 'flex-1 min-h-0' : 'aspect-video'}`}>
          <video
            ref={videoRef} src={content.src} playsInline preload="metadata" className="w-full h-full object-contain"
            onLoadedMetadata={onLoaded} aria-label={content.title} onClick={togglePlay}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
            onVolumeChange={e => setMuted(e.currentTarget.muted || e.currentTarget.volume === 0)}
            onRateChange={e => setRate(e.currentTarget.playbackRate)}
          />
          {!playing && !quiz && (
            <button onClick={togglePlay} aria-label="Play video" className="absolute inset-0 m-auto h-16 w-16 rounded-full bg-black/60 hover:bg-black/75 text-white inline-flex items-center justify-center transition-colors focus-visible:outline-sky-300">
              <Play className="w-7 h-7 translate-x-0.5" fill="currentColor" aria-hidden="true" />
            </button>
          )}
          {resumedAt !== null && !quiz && (
            <button onClick={() => { jump(0); setResumedAt(null); }} className="absolute top-3 left-3 text-xs font-bold bg-black/70 text-white rounded-full px-3 min-h-[36px] hover:bg-black/85 focus-visible:outline-sky-300">
              Resumed at {formatTime(resumedAt)}. Start over
            </button>
          )}
          {hint && !quiz && (
            <div role="status" className="absolute left-3 bottom-3 max-w-[min(26rem,85%)] bg-white text-slate-800 rounded-2xl shadow-xl p-3 flex gap-3 items-start text-sm">
              <IndooFace className="w-9 h-9 shrink-0" />
              <div className="min-w-0"><p className="text-xs font-medium text-slate-500 mb-0.5">Indoo says</p>{hint}</div>
              <button onClick={() => setHint(null)} aria-label="Close hint" className="text-slate-500 hover:text-slate-800 text-xl leading-none min-h-[44px] min-w-[44px] -mt-3 -mr-3">×</button>
            </div>
          )}
          {quiz && (
            <div className="absolute inset-0 bg-slate-950/80 flex p-3 sm:p-6 overflow-auto" role="dialog" aria-modal="true" aria-labelledby="iv-q">
              {/* m-auto centres the card when it fits and lets it scroll from its top edge when it does not */}
              <div className="m-auto bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 w-full max-w-lg shadow-2xl">
                <p className="text-xs font-medium text-slate-500 mb-1">Quick check</p>
                <p id="iv-q" className="text-lg font-bold text-slate-900 dark:text-white mb-4">{quiz.cp.question}</p>
                <div className="space-y-2" role="group" aria-label="Answer options">
                  {quiz.cp.options.map((opt, i) => {
                    const picked = quizAnswer?.choice === i, right = !!quizAnswer && i === quiz.cp.answer;
                    const state = !quizAnswer ? 'border-slate-200 dark:border-slate-700 hover:border-indigo-400' : right ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : picked ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30' : 'border-slate-200 dark:border-slate-700 opacity-60';
                    return (
                      <button key={i} ref={i === 0 ? quizRef : undefined} disabled={!!quizAnswer} onClick={() => answer(quiz.cp, i)}
                        className={`w-full text-left flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 min-h-[48px] transition-colors ${state}`}>
                        <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-sm font-bold text-white ${right ? 'bg-emerald-600' : picked ? 'bg-rose-600' : 'bg-indigo-600'}`}>{'ABCDEF'[i]}</span>
                        <span className="text-slate-800 dark:text-slate-100">{opt}</span>
                      </button>
                    );
                  })}
                </div>
                {quizAnswer && (
                  <div className="mt-4" aria-live="polite">
                    <p className={`text-sm font-bold ${quizAnswer.correct ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>{quizAnswer.correct ? 'Correct.' : 'Not quite. The right answer is highlighted.'}</p>
                    {quiz.cp.explanation && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{quiz.cp.explanation}</p>}
                    <button onClick={closeQuiz} className="mt-3 px-4 min-h-[44px] rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm">Continue</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Control bar: sits under the picture, so it never covers captions or the watermark. */}
        <div className="bg-slate-900 text-white px-2 sm:px-3 pb-1.5">
          <div
            ref={trackRef} role="slider" tabIndex={0} aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(now)}
            aria-valuetext={`${formatTime(now)} of ${formatTime(dur)}${here ? `, ${here.title}` : ''}`}
            onPointerDown={onTrackDown} onPointerMove={onTrackMove} onPointerUp={onTrackUp} onPointerCancel={onTrackUp}
            onPointerLeave={() => { if (!draggingRef.current) setHoverT(null); }} onKeyDown={onTrackKey}
            className="group relative h-11 flex items-center cursor-pointer touch-none select-none focus-visible:outline-sky-300"
          >
            <div className="relative w-full h-1.5 group-hover:h-2.5 group-focus-visible:h-2.5 transition-[height] duration-150 rounded-full bg-white/25">
              {watchedRanges.map(([a, b], i) => (
                <span key={i} className="absolute inset-y-0 bg-white/35" style={{ left: `${pct(a, dur)}%`, width: `${pct(b, dur) - pct(a, dur)}%` }} />
              ))}
              <span className="absolute inset-y-0 left-0 rounded-full bg-indigo-400" style={{ width: `${pct(now, dur)}%` }} />
              {content.chapters.slice(1).map(c => (
                <span key={c.id} aria-hidden="true" className="absolute inset-y-0 w-[3px] -ml-[1.5px] bg-slate-900" style={{ left: `${pct(c.start, dur)}%` }} />
              ))}
              <span aria-hidden="true" className="absolute top-1/2 h-4 w-4 -ml-2 -mt-2 rounded-full bg-white shadow ring-2 ring-indigo-400" style={{ left: `${pct(now, dur)}%` }} />
              {content.checkpoints.map(cp => {
                const done = !!answers[cp.sceneId];
                return (
                  <span key={cp.sceneId} title={done ? 'Question answered' : 'Question here'} className={`absolute -top-3 h-3.5 w-3.5 -ml-[7px] rotate-45 rounded-[3px] border-2 border-slate-900 ${done ? 'bg-emerald-400' : 'bg-amber-300'}`} style={{ left: `${pct(cp.pauseAt, dur)}%` }} />
                );
              })}
            </div>
            {hoverT !== null && (
              <div aria-hidden="true" className="absolute bottom-full mb-1 -translate-x-1/2 pointer-events-none whitespace-nowrap rounded-md bg-black px-2 py-1 text-xs font-semibold tabular-nums" style={{ left: `${clamp(pct(hoverT, dur), 6, 94)}%` }}>
                {formatTime(hoverT)}{chapterAt(content.chapters, hoverT) ? ` · ${chapterAt(content.chapters, hoverT)!.title}` : ''}
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <button onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} className={BAR_BTN}>
              {playing ? <Pause className="w-5 h-5" fill="currentColor" aria-hidden="true" /> : <Play className="w-5 h-5" fill="currentColor" aria-hidden="true" />}
            </button>
            <button onClick={() => skip(-10)} aria-label="Back 10 seconds" className={`${BAR_BTN} text-xs font-bold`}>−10s</button>
            <button onClick={() => skip(10)} aria-label="Forward 10 seconds" className={`${BAR_BTN} text-xs font-bold`}>+10s</button>
            <span className="px-1 sm:px-2 text-sm tabular-nums text-slate-200 whitespace-nowrap">{formatTime(now)} / {formatTime(dur)}</span>
            <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
              <div className="relative" data-speed-menu>
                <button onClick={() => setSpeedOpen(o => !o)} aria-haspopup="menu" aria-expanded={speedOpen} aria-label={`Playback speed, ${formatSpeed(rate)}`} className={`${BAR_BTN} text-sm font-bold tabular-nums`}>{formatSpeed(rate)}</button>
                {speedOpen && (
                  <div role="menu" aria-label="Playback speed" className="absolute bottom-full right-0 mb-2 min-w-[7rem] rounded-xl bg-slate-800 p-1 shadow-xl z-20">
                    {SPEEDS.map(s => (
                      <button key={s} role="menuitemradio" aria-checked={s === rate} onClick={() => setSpeed(s)} className={`w-full min-h-[44px] px-3 rounded-lg text-left text-sm font-semibold tabular-nums hover:bg-white/10 focus-visible:outline-sky-300 ${s === rate ? 'text-sky-300' : 'text-white'}`}>
                        {formatSpeed(s)}{s === 1 ? ' Normal' : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} aria-pressed={muted} className={`${BAR_BTN} max-sm:hidden`}>
                {muted ? <VolumeX className="w-5 h-5" aria-hidden="true" /> : <Volume2 className="w-5 h-5" aria-hidden="true" />}
              </button>
              <button onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'} className={BAR_BTN}>
                {fullscreen ? <Minimize className="w-5 h-5" aria-hidden="true" /> : <Maximize className="w-5 h-5" aria-hidden="true" />}
              </button>
            </div>
          </div>

          {/* Indoo strip: where we are on the campus, and Indoo's help. Part of the control bar, set apart by a hairline. */}
          <div className="mt-1 flex items-center gap-1 border-t border-white/10">
            <nav aria-label="Campus map" className="flex min-w-0 flex-1 items-center gap-1">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <ol className="flex min-w-0 items-center gap-0.5 overflow-x-auto scrollbar-none">
                {stops.map((st, i) => {
                  const done = i < stopIdx, on = i === stopIdx;
                  return (
                    <li key={`${st.station}-${st.start}`} className="shrink-0">
                      <button onClick={() => jump(st.start)} aria-current={on ? 'step' : undefined} aria-label={`Jump to ${st.name}${done ? ', visited' : ''}`} className="inline-flex min-h-[44px] items-center px-0.5 focus-visible:outline-sky-300">
                        <span className={`inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-full px-3 text-xs font-semibold transition-colors sm:text-sm ${on ? 'bg-indigo-500 text-white' : done ? 'bg-white/10 text-slate-100 hover:bg-white/20' : 'text-slate-300 ring-1 ring-inset ring-white/25 hover:bg-white/10'}`}>
                          {done && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                          {st.name}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
            <button onClick={askIndoo} aria-label="Ask Indoo for a hint" className={`${BAR_BTN} gap-2 text-sm font-semibold`}>
              <IndooFace className="h-6 w-6" />
              <span className="max-sm:sr-only">Ask Indoo</span>
            </button>
            <button onClick={toggleSounds} aria-pressed={soundsOn} aria-label={`Indoo's chirps ${soundsOn ? 'on' : 'off'}`} title={`Indoo's chirps ${soundsOn ? 'on' : 'off'}`} className={`${BAR_BTN} relative ${soundsOn ? 'text-sky-300' : 'text-slate-400'}`}>
              <Bird className="h-5 w-5" aria-hidden="true" />
              {!soundsOn && <span aria-hidden="true" className="absolute h-0.5 w-6 rotate-45 rounded bg-slate-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Status: what is left to finish this video. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900/60 sm:px-5" aria-live="polite" data-lesson-id={lessonId}>
        {progress?.completed ? (
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Video complete</span>
        ) : !tracking ? (
          <span className="text-slate-600 dark:text-slate-400">Progress is not saved while previewing.</span>
        ) : (
          <>
            <span className="font-bold text-slate-900 dark:text-white">To finish this video</span>
            <Requirement done={watchedPct >= 90} label={`Watch 90% (${watchedPct}% so far)`} />
            {content.checkpoints.length > 0 && (
              <Requirement done={unanswered.length === 0} label={`Answer ${content.checkpoints.length === 1 ? 'the question' : 'the questions'} (${content.checkpoints.length - unanswered.length} of ${content.checkpoints.length})`} />
            )}
            {unanswered.length > 0 && (
              <button onClick={openNextQuestion} className="min-h-[44px] rounded-lg px-2 font-bold text-indigo-700 hover:underline dark:text-indigo-300">Answer now</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
