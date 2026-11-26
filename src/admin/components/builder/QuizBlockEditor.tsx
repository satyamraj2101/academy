import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, CheckCircle2, Settings2, Library, X, Pencil } from 'lucide-react';
import { adminFetch } from '../../hooks/useD1Query';
import { toast } from '../../../lib/toast';
import { QuizAiPanel } from './QuizAiPanel';

interface QuizTemplate {
  id: string;
  title: string;
  passing_score: number;
  max_attempts: number;
  time_limit_minutes: number | null;
  questions: Array<{ question_text: string; options: string[]; correct_answer: string; explanation?: string; points?: number }>;
}

interface Quiz {
  id: string;
  title: string;
  passing_score: number;
  max_attempts: number;
  time_limit_minutes: number | null;
}

interface Question {
  id: string;
  question_text: string;
  question_type?: 'mcq' | 'true_false' | 'multi_select' | 'short_answer';
  options: string; // JSON string
  correct_answer: string;
  quiz_id?: string;
  explanation?: string | null;
  points: number;
  sort_order?: number;
}

interface QuizBlockEditorProps {
  courseId: string;
  value: string; // JSON: { quizId?: string }
  onChange: (val: string) => void;
}

export function QuizBlockEditor({ courseId, value, onChange }: QuizBlockEditorProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<QuizTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(value || '{}');
      if (parsed.quizId) setSelectedQuizId(parsed.quizId);
    } catch { /* ignore */ }
    fetchQuizzes();
  }, []);

  useEffect(() => {
    if (selectedQuizId) fetchQuestions(selectedQuizId);
  }, [selectedQuizId]);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const data = await adminFetch(`/academy/quizzes?courseId=${courseId}`) as { success: boolean; quizzes: Quiz[] };
      if (data.success) setQuizzes(data.quizzes || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (quizId: string) => {
    try {
      const data = await adminFetch(`/academy/quizzes?id=${quizId}`) as { success: boolean; questions: Question[] };
      if (data.success) setQuestions(data.questions || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load questions');
    }
  };

  const selectQuiz = (quizId: string) => {
    setSelectedQuizId(quizId);
    onChange(JSON.stringify({ quizId }));
  };

  const createQuiz = async () => {
    if (!newQuizTitle.trim()) return;
    try {
      const res = await adminFetch('/academy/quizzes', {
        method: 'POST',
        body: JSON.stringify({ course_id: courseId, title: newQuizTitle.trim(), passing_score: 70, max_attempts: 3 })
      }) as { id: string };
      toast.success('Quiz created');
      setNewQuizTitle('');
      setCreatingQuiz(false);
      await fetchQuizzes();
      selectQuiz(res.id);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create quiz');
    }
  };

  const openTemplates = async () => {
    setShowTemplates(true);
    setLoadingTemplates(true);
    try {
      const data = await adminFetch('/academy/quiz-templates') as { success: boolean; templates: QuizTemplate[] };
      setTemplates(data.templates || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const applyTemplate = async (t: QuizTemplate) => {
    setApplyingTemplate(true);
    try {
      const res = await adminFetch('/academy/quizzes', {
        method: 'POST',
        body: JSON.stringify({ course_id: courseId, title: t.title, passing_score: t.passing_score, max_attempts: t.max_attempts, time_limit_minutes: t.time_limit_minutes }),
      }) as { id: string };
      for (const q of t.questions) {
        await adminFetch('/academy/quiz-questions', {
          method: 'POST',
          body: JSON.stringify({ quiz_id: res.id, question_text: q.question_text, question_type: 'mcq', options: q.options, correct_answer: q.correct_answer, explanation: q.explanation, points: q.points ?? 1 }),
        });
      }
      toast.success(`Quiz created from template with ${t.questions.length} questions`);
      setShowTemplates(false);
      await fetchQuizzes();
      selectQuiz(res.id);
    } catch (e: any) {
      toast.error(e.message || 'Failed to apply template');
    } finally {
      setApplyingTemplate(false);
    }
  };

  const selectedQuiz = quizzes.find(q => q.id === selectedQuizId);

  if (loading) return <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-4">
      {!creatingQuiz ? (
        <div className="flex gap-3">
          <select
            value={selectedQuizId}
            onChange={e => selectQuiz(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Select an existing quiz...</option>
            {quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
          </select>
          <button
            onClick={openTemplates}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg font-medium text-sm shadow-sm transition-colors whitespace-nowrap"
          >
            <Library className="w-4 h-4" /> Use Template
          </button>
          <button
            onClick={() => setCreatingQuiz(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> New Quiz
          </button>
        </div>
      ) : (
        <div className="flex gap-3 bg-slate-100 border border-slate-200 rounded-lg p-3">
          <input
            autoFocus
            value={newQuizTitle}
            onChange={e => setNewQuizTitle(e.target.value)}
            placeholder="e.g. Module 1 Knowledge Check"
            className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
            onKeyDown={e => e.key === 'Enter' && createQuiz()}
          />
          <button onClick={createQuiz} disabled={!newQuizTitle.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg font-medium text-sm transition-colors">Create</button>
          <button onClick={() => { setCreatingQuiz(false); setNewQuizTitle(''); }} className="px-4 py-2 text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors">Cancel</button>
        </div>
      )}

      {selectedQuiz && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-4 text-xs font-semibold text-slate-500">
            <Settings2 className="w-3.5 h-3.5" />
            <span>Passing Score: <b className="text-slate-700">{selectedQuiz.passing_score}%</b></span>
            <span>Max Attempts: <b className="text-slate-700">{selectedQuiz.max_attempts}</b></span>
            <span>Time Limit: <b className="text-slate-700">{selectedQuiz.time_limit_minutes ? `${selectedQuiz.time_limit_minutes}m` : 'None'}</b></span>
          </div>

          <div className="p-4 space-y-3">
            <QuizAiPanel quizId={selectedQuizId} questions={questions} onChanged={() => fetchQuestions(selectedQuizId)} />
            {questions.map((q, i) => (
              <QuestionRow key={q.id} index={i} question={q} onChanged={() => fetchQuestions(selectedQuizId)} />
            ))}

            {questions.length === 0 && !addingQuestion && (
              <p className="text-sm text-slate-400 italic py-2">No questions yet. Add the first one below.</p>
            )}

            {addingQuestion ? (
              <QuestionForm
                quizId={selectedQuizId}
                onDone={() => { setAddingQuestion(false); fetchQuestions(selectedQuizId); }}
                onCancel={() => setAddingQuestion(false)}
              />
            ) : (
              <button
                onClick={() => setAddingQuestion(true)}
                className="w-full py-2.5 border border-dashed border-slate-200 hover:border-indigo-300 rounded-lg text-slate-500 hover:text-indigo-600 text-sm font-medium flex items-center justify-center gap-2 transition-colors bg-slate-50 hover:bg-indigo-50"
              >
                <Plus className="w-4 h-4" /> Add Question
              </button>
            )}
          </div>
        </div>
      )}

      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white sm:rounded-xl w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[80vh] flex flex-col overflow-hidden shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-medium text-slate-800">Choose a Quiz Template</h3>
              <button onClick={() => setShowTemplates(false)} className="p-2 -mr-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingTemplates ? (
                <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
              ) : templates.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-8">No quiz templates in your library yet. Build one from Courses → Library.</p>
              ) : (
                templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    disabled={applyingTemplate}
                    className="w-full text-left p-3 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors disabled:opacity-50"
                  >
                    <p className="font-medium text-sm text-slate-800">{t.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Passing: {t.passing_score}% · {t.questions.length} question{t.questions.length === 1 ? '' : 's'}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq: 'Multiple Choice',
  true_false: 'True / False',
  multi_select: 'Multi-Select',
  short_answer: 'Short Answer (graded manually)',
};

function QuestionRow({ index, question, onChanged }: { index: number; question: Question; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const options: string[] = (() => { try { return JSON.parse(question.options || '[]'); } catch { return []; } })();
  const type = question.question_type || 'mcq';
  const correctSet: string[] = type === 'multi_select'
    ? (() => { try { return JSON.parse(question.correct_answer || '[]'); } catch { return []; } })()
    : [question.correct_answer];

  const handleDelete = async () => {
    try {
      await adminFetch(`/academy/quiz-questions?id=${question.id}`, { method: 'DELETE' });
      toast.success('Question deleted');
      onChanged();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete question');
    }
  };

  if (editing) {
    return <QuestionForm quizId={question.quiz_id || ''} existing={question} onDone={() => { setEditing(false); onChanged(); }} onCancel={() => setEditing(false)} />;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{index + 1}. {question.question_text}</p>
          <span className="text-[11px] font-medium text-slate-400">{QUESTION_TYPE_LABELS[type]}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setEditing(true)} title="Edit this question" aria-label={`Edit question ${index + 1}`} className="text-slate-400 hover:text-indigo-600 p-1.5 min-h-[32px] min-w-[32px] inline-flex items-center justify-center">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleDelete} title="Delete this question" aria-label={`Delete question ${index + 1}`} className="text-slate-400 hover:text-rose-500 p-1.5 min-h-[32px] min-w-[32px] inline-flex items-center justify-center">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {question.explanation && <p className="mt-1 text-xs text-slate-500">Why: {question.explanation}</p>}
      {type === 'short_answer' ? (
        <p className="mt-2 text-xs text-slate-400 italic">Student answers are routed to the Grading Desk for manual scoring.</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((opt, i) => (
            <span key={i} className={`text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1 ${correctSet.includes(opt) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
              {correctSet.includes(opt) && <CheckCircle2 className="w-3 h-3" />} {opt}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

type QType = 'mcq' | 'true_false' | 'multi_select' | 'short_answer';

function QuestionForm({ quizId, existing, onDone, onCancel }: { quizId: string; existing?: Question; onDone: () => void; onCancel: () => void }) {
  // When editing, start from what is stored.
  const start = (() => {
    if (!existing) return null;
    let opts: string[] = [];
    try { opts = JSON.parse(existing.options || '[]'); } catch { /* none */ }
    const type = (existing.question_type || 'mcq') as QType;
    let multi: string[] = [];
    if (type === 'multi_select') { try { multi = JSON.parse(existing.correct_answer || '[]'); } catch { /* none */ } }
    const padded = [...opts, ...Array(Math.max(0, 4 - opts.length)).fill('')];
    return {
      type, opts: type === 'true_false' || type === 'short_answer' ? ['', '', '', ''] : padded,
      correct: Math.max(0, opts.indexOf(existing.correct_answer)),
      multi: new Set(multi.map(a => opts.indexOf(a)).filter(i => i >= 0)),
      tf: (existing.correct_answer === 'False' ? 'False' : 'True') as 'True' | 'False',
    };
  })();
  const [qType, setQType] = useState<QType>(start?.type ?? 'mcq');
  const [text, setText] = useState(existing?.question_text ?? '');
  const [options, setOptions] = useState<string[]>(start?.opts ?? ['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(start?.correct ?? 0);
  const [correctIndices, setCorrectIndices] = useState<Set<number>>(start?.multi ?? new Set());
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<'True' | 'False'>(start?.tf ?? 'True');
  const [points, setPoints] = useState(existing?.points ?? 1);
  const [explanation, setExplanation] = useState(existing?.explanation ?? '');
  const [saving, setSaving] = useState(false);

  const toggleMultiCorrect = (i: number) => {
    setCorrectIndices(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const handleSave = async () => {
    if (!text.trim()) {
      toast.error('Enter the question text');
      return;
    }

    let payload: any = { quiz_id: quizId, question_text: text.trim(), question_type: qType, points, explanation: explanation.trim() || null };

    if (qType === 'mcq') {
      const cleanOptions = options.map(o => o.trim()).filter(Boolean);
      if (cleanOptions.length < 2) { toast.error('Enter at least 2 answer options'); return; }
      payload = { ...payload, options: cleanOptions, correct_answer: options[correctIndex].trim() };
    } else if (qType === 'true_false') {
      payload = { ...payload, options: ['True', 'False'], correct_answer: trueFalseAnswer };
    } else if (qType === 'multi_select') {
      const cleanOptions = options.map(o => o.trim()).filter(Boolean);
      if (cleanOptions.length < 2) { toast.error('Enter at least 2 answer options'); return; }
      const correctOpts = [...correctIndices].filter(i => options[i]?.trim()).map(i => options[i].trim());
      if (correctOpts.length === 0) { toast.error('Mark at least one option as correct'); return; }
      payload = { ...payload, options: cleanOptions, correct_answer: JSON.stringify(correctOpts) };
    } else {
      payload = { ...payload, options: [], correct_answer: '' };
    }

    setSaving(true);
    try {
      if (existing) await adminFetch('/academy/quiz-questions', { method: 'PUT', body: JSON.stringify({ ...payload, id: existing.id, sort_order: existing.sort_order ?? 0 }) });
      else await adminFetch('/academy/quiz-questions', { method: 'POST', body: JSON.stringify(payload) });
      onDone();
    } catch (e: any) {
      toast.error(e.message || (existing ? 'Failed to save question' : 'Failed to add question'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="flex gap-2 flex-wrap">
        {(['mcq', 'true_false', 'multi_select', 'short_answer'] as QType[]).map(t => (
          <button
            key={t}
            onClick={() => setQType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${qType === t ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'}`}
          >
            {QUESTION_TYPE_LABELS[t]}
          </button>
        ))}
      </div>
      <input
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Question text..."
        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
      />

      {qType === 'mcq' && (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} title="Mark as correct answer" />
              <input
                value={opt}
                onChange={e => setOptions(o => o.map((v, idx) => idx === i ? e.target.value : v))}
                placeholder={`Option ${i + 1}${i < 2 ? ' (required)' : ' (optional)'}`}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          ))}
          <p className="text-[11px] text-slate-500">Select the radio button next to the correct answer.</p>
        </div>
      )}

      {qType === 'true_false' && (
        <div className="flex gap-4">
          {(['True', 'False'] as const).map(v => (
            <label key={v} className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
              <input type="radio" checked={trueFalseAnswer === v} onChange={() => setTrueFalseAnswer(v)} /> {v}
            </label>
          ))}
        </div>
      )}

      {qType === 'multi_select' && (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="checkbox" checked={correctIndices.has(i)} onChange={() => toggleMultiCorrect(i)} title="Mark as a correct answer" />
              <input
                value={opt}
                onChange={e => setOptions(o => o.map((v, idx) => idx === i ? e.target.value : v))}
                placeholder={`Option ${i + 1}${i < 2 ? ' (required)' : ' (optional)'}`}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          ))}
          <p className="text-[11px] text-slate-500">Check every option that's correct — students must select exactly that set to earn credit.</p>
        </div>
      )}

      {qType === 'short_answer' && (
        <p className="text-[11px] text-slate-500">No answer options needed. Student responses are routed to the Grading Desk for manual scoring.</p>
      )}

      <input
        value={explanation}
        onChange={e => setExplanation(e.target.value)}
        placeholder="Why this is the answer (shown after answering, optional)"
        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
      />

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-500">Points</label>
        <input
          type="number"
          min={1}
          value={points}
          onChange={e => setPoints(Number(e.target.value) || 1)}
          className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2">
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {existing ? 'Save changes' : 'Save Question'}
        </button>
      </div>
    </div>
  );
}
