import { useEffect, useState } from 'react';
import { Loader2, Pencil, TriangleAlert } from 'lucide-react';

type Scene = Record<string, any>;
export interface Script { title?: string; scenes: Scene[] }

interface Props {
  scriptSrc: string;
  busy: boolean;
  /** Sends the edited script to be rendered. */
  onSubmit: (script: Script) => void;
}

const WELCOME_TITLE = 'Meet Soomy and Indoo';
const isWelcome = (s: Scene) => s?.slide?.title === WELCOME_TITLE || String(s?.spoken || '').startsWith("Hi, I'm Soomy, your instructor");
const inputCls = 'w-full min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-sky-400';

function Field({ label, value, onChange, area }: { label: string; value: string; onChange: (v: string) => void; area?: boolean }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      {area
        ? <textarea rows={4} value={value} onChange={e => onChange(e.target.value)} className={`${inputCls} resize-y`} />
        : <input value={value} onChange={e => onChange(e.target.value)} className={inputCls} />}
    </label>
  );
}

/** Returns a copy of the script with one value changed along a path of keys. */
export function setIn(script: Script, scene: number, path: (string | number)[], value: unknown): Script {
  const next = structuredClone(script);
  let node: any = next.scenes[scene];
  for (const k of path.slice(0, -1)) node = node[k];
  node[path[path.length - 1]] = value;
  // The captions are made from what is said, so changing the speech means the old captions are stale.
  if (path[0] === 'spoken') delete next.scenes[scene].narration;
  return next;
}

/**
 * Edit the scenes of a video by hand: what Soomy says and what appears on screen. The video is rebuilt with the same renderer as
 * an AI change, and only the scenes that changed are drawn again.
 */
export function VideoScenesEditor({ scriptSrc, busy, onSubmit }: Props) {
  const [script, setScript] = useState<Script | null>(null);
  const [error, setError] = useState('');
  const [original, setOriginal] = useState('');

  useEffect(() => {
    let alive = true;
    fetch(scriptSrc).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }).then((s: Script) => {
      if (!alive) return;
      if (!Array.isArray(s?.scenes) || !s.scenes.length) throw new Error('empty');
      setScript(s); setOriginal(JSON.stringify(s));
    }).catch(() => { if (alive) setError('The saved scenes could not be loaded. Use "Rebuild video" below to make a fresh copy first.'); });
    return () => { alive = false; };
  }, [scriptSrc]);

  if (error) return <p className="mt-2 flex items-start gap-1.5 text-xs text-rose-700" role="alert"><TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" /> {error}</p>;
  if (!script) return <p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Loading the scenes…</p>;

  const dirty = JSON.stringify(script) !== original;
  const set = (i: number, path: (string | number)[], v: unknown) => setScript(s => (s ? setIn(s, i, path, v) : s));

  const list = (i: number, key: 'bullets' | 'steps' | 'takeaways', label: string) => {
    const items: any[] = script.scenes[i].slide?.[key] || [];
    return items.map((it, j) => (
      <div key={`${key}${j}`} className="space-y-1">
        <Field label={`${label} ${j + 1}`} value={typeof it === 'string' ? it : it.text || ''} onChange={v => set(i, typeof it === 'string' ? ['slide', key, j] : ['slide', key, j, 'text'], v)} />
        {key === 'steps' && typeof it === 'object' && <Field label={`${label} ${j + 1} detail`} value={it.desc || ''} onChange={v => set(i, ['slide', key, j, 'desc'], v)} />}
      </div>
    ));
  };

  return (
    <div className="mt-3 space-y-3" aria-label="Edit scenes">
      <p className="text-xs text-slate-600">Change what Soomy says and what appears on screen. Items on screen appear when their words are spoken, so if you rewrite a sentence the item may show at a default time instead. Only scenes you change are drawn again.</p>
      {script.scenes.map((sc, i) => {
        if (isWelcome(sc)) return <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500"><b className="text-slate-700">Scene {i + 1}: welcome.</b> The same in every course, so it is not editable.</div>;
        const slide = sc.slide || {};
        const quiz = slide.quiz;
        return (
          <fieldset key={i} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
            <legend className="px-1 text-xs font-medium text-slate-700">Scene {i + 1} · {slide.layout}</legend>
            <Field label="Slide title" value={slide.title || ''} onChange={v => set(i, ['slide', 'title'], v)} />
            {slide.layout === 'hook' && <><Field label="Kicker" value={slide.kicker || ''} onChange={v => set(i, ['slide', 'kicker'], v)} /><Field label="Subtitle" value={slide.subtitle || ''} onChange={v => set(i, ['slide', 'subtitle'], v)} /></>}
            {slide.layout === 'bullets' && list(i, 'bullets', 'Point')}
            {slide.layout === 'steps' && list(i, 'steps', 'Step')}
            {slide.layout === 'recap' && list(i, 'takeaways', 'Takeaway')}
            {slide.layout === 'quiz' && quiz && (<>
              <Field label="Question on screen" value={quiz.question || ''} onChange={v => set(i, ['slide', 'quiz', 'question'], v)} />
              {(quiz.options || []).map((o: string, j: number) => <Field key={j} label={`Option ${'ABC'[j] || j + 1}${quiz.answer === j ? ' (correct)' : ''}`} value={o} onChange={v => set(i, ['slide', 'quiz', 'options', j], v)} />)}
              <p className="text-[11px] text-slate-500">Keep " || " in the speech: what comes before it is the question, after it is the answer.</p>
            </>)}
            <Field area label="What Soomy says" value={sc.spoken || ''} onChange={v => set(i, ['spoken'], v)} />
          </fieldset>
        );
      })}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!dirty || busy} onClick={() => onSubmit(script)}
          className="min-h-[44px] inline-flex items-center gap-1.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Pencil className="w-4 h-4" aria-hidden="true" />} Rebuild with my edits
        </button>
        {!dirty && <span className="text-xs text-slate-500">Change something above first.</span>}
      </div>
    </div>
  );
}
