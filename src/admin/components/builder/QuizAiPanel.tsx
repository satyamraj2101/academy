import { useId, useState } from 'react';
import { CheckCircle2, Loader2, Undo2, Wand2 } from 'lucide-react';
import { adminFetch } from '../../hooks/useD1Query';
import { toast } from '../../../lib/toast';
import { PromptImprover } from '../PromptImprover';
import { planQuizChanges, toQuizQ, type QuizChange, type QuizQ } from '../../../../functions/api/admin/academy/_quizEdit';

interface Props {
  quizId: string;
  /** The stored questions (database rows). */
  questions: any[];
  /** Called after the quiz was changed (applied or undone) so the list reloads. */
  onChanged: () => void;
}

interface Proposal { questions: QuizQ[]; changes: string[]; dropped: number; plan: QuizChange[]; original: QuizQ[] }
interface UndoState { original: QuizQ[]; createdIds: string[] }

const body = (q: QuizQ, order: number) => ({ question_text: q.question_text, question_type: q.question_type, options: q.options, correct_answer: q.correct_answer, explanation: q.explanation || null, points: q.points, sort_order: order });
const put = (q: QuizQ, order: number) => adminFetch('/academy/quiz-questions', { method: 'PUT', body: JSON.stringify({ id: q.id, ...body(q, order) }) });
const post = (quizId: string, q: QuizQ) => adminFetch('/academy/quiz-questions', { method: 'POST', body: JSON.stringify({ quiz_id: quizId, ...body(q, 0) }) }) as Promise<{ id: string }>;
const del = (id: string) => adminFetch(`/academy/quiz-questions?id=${encodeURIComponent(id)}`, { method: 'DELETE' });

const BADGE: Record<string, string> = { edit: 'bg-amber-100 text-amber-900', add: 'bg-emerald-100 text-emerald-900', remove: 'bg-rose-100 text-rose-900' };
const LABEL: Record<string, string> = { edit: 'Changed', add: 'New', remove: 'Removed' };

const answerText = (q: QuizQ) => q.question_type === 'multi_select' ? (() => { try { return (JSON.parse(q.correct_answer) as string[]).join(', '); } catch { return q.correct_answer; } })() : q.correct_answer;

/**
 * "Ask AI to change this quiz": the AI returns the whole question list with only the requested change. The admin reviews what
 * would change (changed, new, removed), applies it, and can undo it. Questions are written one by one through the normal question
 * endpoints, so everything is logged the same way as a manual edit.
 */
export function QuizAiPanel({ quizId, questions, onChanged }: Props) {
  const id = useId();
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState<'ask' | 'apply' | 'undo' | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [undo, setUndo] = useState<UndoState | null>(null);

  const ask = async () => {
    setBusy('ask'); setProposal(null); setUndo(null);
    try {
      const original = questions.map(toQuizQ);
      const res = await adminFetch('/academy/quiz-ai-edit', { method: 'POST', body: JSON.stringify({ quizId, instruction }) }) as any;
      if (res.unavailable) { toast.error(res.unavailable); return; }
      const plan = planQuizChanges(original, res.questions as QuizQ[]);
      if (plan.every(c => c.kind === 'same')) { toast.error('The AI made no change', 'Try wording the request more specifically.'); return; }
      setProposal({ questions: res.questions, changes: res.changes || [], dropped: res.dropped || 0, plan, original });
    } catch (e: any) {
      toast.error(e.message || 'Error contacting the AI editor');
    } finally { setBusy(null); }
  };

  const apply = async () => {
    if (!proposal) return;
    setBusy('apply');
    const { plan, original } = proposal;
    const createdIds: string[] = [];
    try {
      let order = 0;
      for (const c of plan) {
        if (c.kind === 'remove') continue;
        order++;
        if (c.kind === 'add') {
          const r = await post(quizId, c.after);
          createdIds.push(r.id);
          await put({ ...c.after, id: r.id }, order);
        } else if (c.kind === 'edit' || original.findIndex(o => o.id === c.before.id) + 1 !== order) {
          await put(c.after, order);
        }
      }
      for (const c of plan) if (c.kind === 'remove') await del(c.before.id!);
      setUndo({ original, createdIds });
      setProposal(null); setInstruction('');
      toast.success('Quiz updated');
    } catch (e: any) {
      toast.error('The quiz was only partly changed', e.message || 'Reload the quiz to see where it stands.');
      setUndo({ original, createdIds });
    } finally { setBusy(null); onChanged(); }
  };

  const undoAll = async () => {
    if (!undo) return;
    setBusy('undo');
    try {
      const keep = new Set(undo.createdIds);
      for (const idc of keep) await del(idc);
      const stored = new Set(questions.map(q => q.id));
      let order = 0;
      for (const q of undo.original) {
        order++;
        if (q.id && stored.has(q.id)) await put(q, order);        // still there: put its old content and place back
        else { const r = await post(quizId, q); await put({ ...q, id: r.id }, order); } // was removed: bring it back
      }
      setUndo(null);
      toast.success('Quiz restored');
    } catch (e: any) {
      toast.error('Could not fully undo', e.message || 'Reload the quiz to see where it stands.');
    } finally { setBusy(null); onChanged(); }
  };

  const shown = proposal?.plan.filter(c => c.kind !== 'same') ?? [];
  const same = (proposal?.plan.length ?? 0) - shown.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <label htmlFor={`quiz-ai-${id}`} className="flex items-center gap-1.5 text-sm font-medium text-slate-700"><Wand2 className="w-4 h-4" aria-hidden="true" /> Ask AI to change this quiz</label>
      <p className="text-xs text-slate-600 mt-0.5">For example: make question 2 easier, add two questions about renewals, remove the true/false ones. You review the result before anything changes.</p>
      <div className="mt-2 flex flex-col sm:flex-row gap-2">
        <textarea id={`quiz-ai-${id}`} rows={2} value={instruction} maxLength={1500} onChange={e => setInstruction(e.target.value)}
          placeholder="What should change in this quiz?"
          className="flex-1 min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-slate-200 resize-y" />
        <button type="button" onClick={ask} disabled={busy !== null || questions.length === 0 || instruction.trim().length < 3}
          className="sm:self-start min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50">
          {busy === 'ask' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
          {busy === 'ask' ? 'Changing…' : 'Change it'}
        </button>
      </div>
      <PromptImprover kind="edit_request" text={instruction} onApply={v => { if (typeof v.improved === 'string') setInstruction(v.improved); }} />

      {proposal && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3" role="region" aria-label="Proposed quiz changes">
          <p className="text-sm font-medium text-slate-800">The AI would change {shown.length} question{shown.length === 1 ? '' : 's'}{same ? ` (${same} stay as they are)` : ''}</p>
          {proposal.changes.length > 0 && <ul className="mt-1 list-disc list-inside text-xs text-slate-600">{proposal.changes.map((c, i) => <li key={i}>{c}</li>)}</ul>}
          <ul className="mt-2 space-y-2">
            {shown.map((c, i) => {
              const q = c.kind === 'remove' ? c.before : c.after;
              return (
                <li key={i} className="rounded-md border border-slate-200 p-2 text-sm">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${BADGE[c.kind]}`}>{LABEL[c.kind]}</span>
                  {c.kind === 'edit' && c.before.question_text !== c.after.question_text && <p className="mt-1 text-xs text-slate-400 line-through">{c.before.question_text}</p>}
                  <p className="mt-1 font-semibold text-slate-800">{q.question_text}</p>
                  {q.question_type !== 'short_answer' && (
                    <p className="mt-0.5 text-xs text-slate-600">
                      {q.options.join('  ·  ')}<br />
                      <span className="font-semibold text-emerald-700">Answer: {answerText(q)}</span>
                      {c.kind === 'edit' && answerText(c.before) !== answerText(c.after) && <span className="text-slate-400 line-through ml-2">{answerText(c.before)}</span>}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          {proposal.dropped > 0 && <p className="mt-2 text-xs text-amber-800">{proposal.dropped} question{proposal.dropped === 1 ? '' : 's'} from the AI could not be used (no valid right answer) and {proposal.dropped === 1 ? 'was' : 'were'} left out.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={apply} disabled={busy !== null} className="min-h-[40px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2">
              {busy === 'apply' && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Apply to the quiz
            </button>
            <button type="button" onClick={() => setProposal(null)} disabled={busy !== null} className="min-h-[40px] px-4 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium">Discard</button>
          </div>
        </div>
      )}

      {undo && !proposal && (
        <p className="mt-2 text-xs font-semibold text-emerald-700 flex flex-wrap items-center gap-2" role="status">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> AI change applied.
          <button type="button" onClick={undoAll} disabled={busy !== null} className="min-h-[36px] underline text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 disabled:opacity-50">
            {busy === 'undo' ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />} Undo
          </button>
        </p>
      )}
    </div>
  );
}
