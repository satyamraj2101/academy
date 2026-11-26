import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, Undo2, X } from 'lucide-react';
import { adminFetch } from '../hooks/useD1Query';

export type ImproveKind = 'course_brief' | 'lesson_topic' | 'quiz_topic' | 'assignment' | 'video_note' | 'edit_request' | 'general';

/** What the parent should write back into its form. Either one text, or the brief's fields. */
export interface Applied { improved?: string; improvedFields?: Record<string, string> }

interface Result extends Applied {
  changes: { type: 'fix' | 'clarify' | 'add'; note: string }[];
  missing: string[];
  score: number | null;
  unavailable?: string;
}

interface Props {
  kind: ImproveKind;
  /** One prompt (lesson topic, quiz request, a note). */
  text?: string;
  /** Or a whole course brief: topic, audience, level, goal, duration, tone. */
  fields?: Record<string, string>;
  onApply: (value: Applied) => void;
}

const AUTO_KEY = 'academy:prompt-improver:auto';
const MIN_CHARS = 12;
const DEBOUNCE_MS = 2000;
const FIELD_LABEL: Record<string, string> = { topic: 'Topic', audience: 'Audience', level: 'Level', goal: 'Goal', duration: 'Duration', tone: 'Tone' };
const CHANGE_LABEL = { fix: 'Fixed', clarify: 'Clearer', add: 'Added' } as const;

function readAuto() { try { return localStorage.getItem(AUTO_KEY) === 'on'; } catch { return false; } }

/**
 * Sits under a prompt box. When the admin pauses typing it asks the AI helper (Cloudflare's free tier) for a clearer version
 * and shows what it would change. Nothing is overwritten without a click, unless "apply automatically" is switched on, and
 * even then there is an Undo.
 */
export function PromptImprover({ kind, text, fields, onApply }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'clear' | 'unavailable' | 'applied'>('idle');
  const [result, setResult] = useState<Result | null>(null);
  const [auto, setAuto] = useState(readAuto);

  const sig = JSON.stringify(fields ?? text ?? '');
  const length = fields ? Object.values(fields).join('').length : (text ?? '').length;

  const reqId = useRef(0);
  const dismissedSig = useRef('');
  const justApplied = useRef(false);
  const undo = useRef<Applied | null>(null);
  const latest = useRef({ text, fields, onApply, auto });
  latest.current = { text, fields, onApply, auto };

  const apply = useCallback((r: Result) => {
    const cur = latest.current;
    undo.current = fields ? { improvedFields: { ...cur.fields } } : { improved: cur.text };
    justApplied.current = true; // the edit we are about to make must not trigger another suggestion
    cur.onApply({ improved: r.improved, improvedFields: r.improvedFields });
    setStatus('applied');
  }, [fields]);

  const run = useCallback(async (manual: boolean) => {
    const id = ++reqId.current;
    setStatus('loading');
    try {
      const cur = latest.current;
      const res = await adminFetch('/academy/improve-prompt', { method: 'POST', body: JSON.stringify(cur.fields ? { kind, fields: cur.fields } : { kind, text: cur.text }) }) as Result;
      if (id !== reqId.current) return; // the admin kept typing: this answer is about older text
      if (res.unavailable) { setResult(res); setStatus(manual ? 'unavailable' : 'idle'); return; }
      setResult(res);
      if (!res.changes.length) { setStatus('clear'); return; }
      if (cur.auto) apply(res); else setStatus('ready');
    } catch {
      if (id === reqId.current) setStatus(manual ? 'unavailable' : 'idle');
    }
  }, [kind, apply]);

  // Ask automatically once typing pauses.
  useEffect(() => {
    if (justApplied.current) { justApplied.current = false; return; }
    reqId.current++; // anything in flight is now stale
    if (length < MIN_CHARS) { setStatus('idle'); return; }
    if (sig === dismissedSig.current) return;
    setStatus('idle');
    const t = window.setTimeout(() => { void run(false); }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [sig, length, run]);

  const toggleAuto = (on: boolean) => { setAuto(on); try { localStorage.setItem(AUTO_KEY, on ? 'on' : 'off'); } catch { /* private mode */ } };
  const dismiss = () => { dismissedSig.current = sig; setStatus('idle'); };
  const doUndo = () => { if (!undo.current) return; justApplied.current = true; onApply(undo.current); dismissedSig.current = JSON.stringify(fields ?? text ?? ''); undo.current = null; setStatus('idle'); };

  const changedFields = result?.improvedFields && fields ? Object.keys(FIELD_LABEL).filter(k => (result.improvedFields![k] || '') !== (fields[k] || '').trim()) : [];

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <button
          type="button" onClick={() => void run(true)} disabled={length < 3 || status === 'loading'}
          className="inline-flex items-center gap-1.5 min-h-[36px] text-xs font-medium text-slate-700 hover:text-slate-900 disabled:opacity-50"
        >
          {status === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : null}
          {status === 'loading' ? 'Checking your prompt…' : 'Improve with AI'}
        </button>
        <label className="inline-flex items-center gap-1.5 min-h-[36px] text-xs text-slate-500 cursor-pointer">
          <input type="checkbox" checked={auto} onChange={e => toggleAuto(e.target.checked)} className="rounded border-slate-300" />
          Apply suggestions automatically
        </label>
        {status === 'clear' && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check className="w-3.5 h-3.5" aria-hidden="true" /> Looks clear</span>}
        {status === 'applied' && (
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <Check className="w-3.5 h-3.5" aria-hidden="true" /> Improved
            <button type="button" onClick={doUndo} className="inline-flex items-center gap-1 min-h-[36px] text-slate-600 hover:text-slate-900 underline"><Undo2 className="w-3.5 h-3.5" aria-hidden="true" /> Undo</button>
          </span>
        )}
        {status === 'unavailable' && <span className="text-xs text-slate-500">{result?.unavailable || 'Suggestions are not available right now.'}</span>}
      </div>

      {status === 'ready' && result && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium text-slate-700 flex items-center gap-1.5">  Suggested improvement{result.score ? <span className="font-medium text-slate-700"> · clarity {result.score}/5</span> : null}</p>
            <button type="button" onClick={dismiss} aria-label="Dismiss suggestion" className="min-h-[36px] min-w-[36px] -mt-2 -mr-2 inline-flex items-center justify-center text-slate-500 hover:text-slate-800"><X className="w-4 h-4" aria-hidden="true" /></button>
          </div>
          {fields ? (
            <dl className="mt-2 space-y-1.5">
              {changedFields.map(k => (<div key={k}><dt className="text-xs font-medium text-slate-700">{FIELD_LABEL[k]}</dt><dd className="text-slate-800 whitespace-pre-wrap">{result.improvedFields![k]}</dd></div>))}
            </dl>
          ) : (
            <p className="mt-2 text-slate-800 whitespace-pre-wrap rounded border border-slate-200 bg-white p-2">{result.improved}</p>
          )}
          {result.changes.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-slate-700">
              {result.changes.map((c, i) => <li key={i}><span className="font-medium text-slate-700">{CHANGE_LABEL[c.type]}:</span> {c.note}</li>)}
            </ul>
          )}
          {result.missing.length > 0 && <p className="mt-2 text-xs text-amber-800"><span className="font-medium">Still missing:</span> {result.missing.join('; ')}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => apply(result)} className="min-h-[40px] px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium">Use this</button>
            <button type="button" onClick={dismiss} className="min-h-[40px] px-4 rounded-lg border border-slate-300 text-slate-700 hover:bg-white text-sm font-medium">Keep mine</button>
          </div>
        </div>
      )}
    </div>
  );
}
