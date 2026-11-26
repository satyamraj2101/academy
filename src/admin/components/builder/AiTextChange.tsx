import { useId, useState } from 'react';
import { CheckCircle2, Loader2, Sparkles, Undo2, Wand2 } from 'lucide-react';
import { adminFetch } from '../../hooks/useD1Query';
import { toast } from '../../../lib/toast';
import { PromptImprover } from '../PromptImprover';

interface Props {
  /** What the text is, so the AI edits it the right way. */
  what: 'assignment';
  label: string;
  value: string;
  onApply: (text: string) => void;
  placeholder?: string;
}

/** A small "tell the AI what to change" box for a plain text field: shows the proposed text, applies on a click, and can undo. */
export function AiTextChange({ what, label, value, onApply, placeholder }: Props) {
  const id = useId();
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<{ revised: string; changes: string[] } | null>(null);
  const [before, setBefore] = useState<string | null>(null);

  const ask = async () => {
    setBusy(true); setProposal(null); setBefore(null);
    try {
      const res = await adminFetch('/academy/lesson-ai-edit', { method: 'POST', body: JSON.stringify({ content: value, instruction, what }) }) as any;
      if (res.unavailable) { toast.error(res.unavailable); return; }
      if (!res.changes?.length) { toast.error('The AI made no change', 'Try wording the request more specifically.'); return; }
      setProposal({ revised: res.revised, changes: res.changes });
    } catch (e: any) {
      toast.error(e.message || 'Error contacting the AI editor');
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3">
      <label htmlFor={`ai-text-${id}`} className="flex items-center gap-1.5 text-sm font-bold text-violet-900"><Wand2 className="w-4 h-4" aria-hidden="true" /> {label}</label>
      <div className="mt-2 flex flex-col sm:flex-row gap-2">
        <textarea id={`ai-text-${id}`} rows={2} value={instruction} maxLength={1500} onChange={e => setInstruction(e.target.value)}
          placeholder={placeholder || 'What should change?'}
          className="flex-1 min-h-[44px] rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-violet-400 resize-y" />
        <button type="button" onClick={ask} disabled={busy || value.trim().length < 20 || instruction.trim().length < 3}
          className="sm:self-start min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Sparkles className="w-4 h-4" aria-hidden="true" />}
          {busy ? 'Changing…' : 'Change it'}
        </button>
      </div>
      <PromptImprover kind="edit_request" text={instruction} onApply={v => { if (typeof v.improved === 'string') setInstruction(v.improved); }} />
      {proposal && (
        <div className="mt-3 rounded-lg border border-violet-200 bg-white p-3" role="region" aria-label="Proposed change">
          <p className="text-sm font-bold text-slate-800">What the AI changed</p>
          <ul className="mt-1 list-disc list-inside text-xs text-slate-600">{proposal.changes.map((c, i) => <li key={i}>{c}</li>)}</ul>
          <p className="mt-2 whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2 text-sm text-slate-800">{proposal.revised}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => { setBefore(value); onApply(proposal.revised); setProposal(null); setInstruction(''); }} className="min-h-[40px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">Use this</button>
            <button type="button" onClick={() => setProposal(null)} className="min-h-[40px] px-4 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-bold">Discard</button>
          </div>
        </div>
      )}
      {before !== null && !proposal && (
        <p className="mt-2 text-xs font-semibold text-emerald-700 flex flex-wrap items-center gap-2" role="status">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> AI change applied. It is saved when you click Update Assignment.
          <button type="button" onClick={() => { onApply(before); setBefore(null); }} className="min-h-[36px] underline text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"><Undo2 className="w-3.5 h-3.5" aria-hidden="true" /> Undo</button>
        </p>
      )}
    </div>
  );
}
