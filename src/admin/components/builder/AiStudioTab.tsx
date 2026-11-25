import { PromptImprover } from '../PromptImprover';
import { useState, useEffect } from 'react';
import { Sparkles, Loader2, FileText, ClipboardCheck, ClipboardList, Copy, Check, PlusCircle, Cpu, Trash2 } from 'lucide-react';
import { adminFetch } from '../../hooks/useD1Query';
import { toast } from '../../../lib/toast';
import { useGeminiModels } from '../../hooks/useGeminiModels';

type Mode = 'lesson' | 'quiz' | 'assignment';

interface Module {
  id: string;
  title: string;
}

interface LessonOption {
  id: string;
  title: string;
}

interface GeneratedQuestion {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
  points?: number;
}

export function AiStudioTab({ courseId }: { courseId: string }) {
  const { models, selectedModel, setSelectedModel } = useGeminiModels();
  const [mode, setMode] = useState<Mode>('lesson');
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [generating, setGenerating] = useState(false);

  const [lessonMarkdown, setLessonMarkdown] = useState('');
  const [quizResult, setQuizResult] = useState<{ title: string; passing_score: number; questions: GeneratedQuestion[] } | null>(null);
  const [assignmentResult, setAssignmentResult] = useState<{ prompt_text: string; submission_type: string; max_score: number } | null>(null);

  const [modules, setModules] = useState<Module[]>([]);
  const [targetModuleId, setTargetModuleId] = useState('');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [moduleLessons, setModuleLessons] = useState<LessonOption[]>([]);
  const [targetLessonId, setTargetLessonId] = useState('');
  const [loadingLessons, setLoadingLessons] = useState(false);

  useEffect(() => {
    adminFetch(`/academy/modules?courseId=${courseId}`)
      .then((data: any) => {
        if (data.modules) {
          setModules(data.modules);
          if (data.modules.length > 0) setTargetModuleId(data.modules[0].id);
        }
      })
      .catch(() => {});
  }, [courseId]);

  useEffect(() => {
    if (mode !== 'assignment' || !targetModuleId) { setModuleLessons([]); setTargetLessonId(''); return; }
    setLoadingLessons(true);
    adminFetch(`/academy/lessons?moduleId=${targetModuleId}`)
      .then((data: any) => {
        const lessons = data.lessons || [];
        setModuleLessons(lessons);
        setTargetLessonId(lessons[0]?.id || '');
      })
      .catch(() => setModuleLessons([]))
      .finally(() => setLoadingLessons(false));
  }, [mode, targetModuleId]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Enter a topic first');
      return;
    }
    setGenerating(true);
    setLessonMarkdown('');
    setQuizResult(null);
    setAssignmentResult(null);
    try {
      const res = await adminFetch('/academy/gemini-generate', {
        method: 'POST',
        body: JSON.stringify({ mode, topic, context, numQuestions, model: selectedModel }),
      }) as any;

      if (mode === 'lesson') {
        setLessonMarkdown(res.markdown || '');
        setNewLessonTitle(topic);
      } else if (mode === 'quiz') {
        setQuizResult({ title: res.title, passing_score: res.passing_score, questions: res.questions || [] });
      } else {
        setAssignmentResult({ prompt_text: res.prompt_text, submission_type: res.submission_type, max_score: res.max_score });
      }
      toast.success('Content generated');
    } catch (e: any) {
      toast.error(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const createLesson = async () => {
    if (!targetModuleId) { toast.error('Choose a module'); return; }
    if (!newLessonTitle.trim()) { toast.error('Enter a lesson title'); return; }
    setCreating(true);
    try {
      const lessonRes = await adminFetch('/academy/lessons', {
        method: 'POST',
        body: JSON.stringify({ module_id: targetModuleId, title: newLessonTitle.trim(), content_type: 'blocks' }),
      }) as { id: string };

      await adminFetch(`/academy/lessons/${lessonRes.id}/sections`, {
        method: 'PUT',
        body: JSON.stringify({ sections: [{ section_type: 'markdown', content: lessonMarkdown, is_mandatory: true }] }),
      });

      toast.success('Lesson created — open the Curriculum tab to see it');
      setLessonMarkdown('');
      setTopic('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create lesson');
    } finally {
      setCreating(false);
    }
  };

  const createQuiz = async () => {
    if (!targetModuleId) { toast.error('Choose a module'); return; }
    if (!quizResult) return;
    setCreating(true);
    try {
      const quizRes = await adminFetch('/academy/quizzes', {
        method: 'POST',
        body: JSON.stringify({ course_id: courseId, module_id: targetModuleId, title: quizResult.title, passing_score: quizResult.passing_score, max_attempts: 3 }),
      }) as { id: string };

      for (const q of quizResult.questions) {
        await adminFetch('/academy/quiz-questions', {
          method: 'POST',
          body: JSON.stringify({ quiz_id: quizRes.id, question_text: q.question_text, question_type: 'mcq', options: q.options, correct_answer: q.correct_answer, explanation: q.explanation, points: q.points ?? 1 }),
        });
      }

      toast.success(`Quiz created with ${quizResult.questions.length} questions — add a Quiz block in a lesson and select it`);
      setQuizResult(null);
      setTopic('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create quiz');
    } finally {
      setCreating(false);
    }
  };

  const createAssignment = async () => {
    if (!targetLessonId) { toast.error('Choose a lesson'); return; }
    if (!assignmentResult) return;
    setCreating(true);
    try {
      await adminFetch('/academy/assignments', {
        method: 'POST',
        body: JSON.stringify({
          lesson_id: targetLessonId,
          prompt_text: assignmentResult.prompt_text,
          submission_type: assignmentResult.submission_type,
          max_score: assignmentResult.max_score,
        }),
      });

      toast.success('Assignment created — add an Assignment block in that lesson to attach it');
      setAssignmentResult(null);
      setTopic('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create assignment');
    } finally {
      setCreating(false);
    }
  };

  const updateQuizQuestion = (i: number, patch: Partial<GeneratedQuestion>) => {
    if (!quizResult) return;
    setQuizResult({
      ...quizResult,
      questions: quizResult.questions.map((q, idx) => idx === i ? { ...q, ...patch } : q)
    });
  };

  const removeQuizQuestion = (i: number) => {
    if (!quizResult) return;
    setQuizResult({
      ...quizResult,
      questions: quizResult.questions.filter((_, idx) => idx !== i)
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">AI Content Studio</h3>
          <p className="text-sm text-slate-500">Generate a lesson, quiz, or assignment from a topic — then drop it straight into your curriculum.</p>
        </div>
      </div>

      <div className="flex gap-2">
        {([
          { key: 'lesson', label: 'Lesson', icon: FileText },
          { key: 'quiz', label: 'Quiz', icon: ClipboardCheck },
          { key: 'assignment', label: 'Assignment', icon: ClipboardList },
        ] as const).map(m => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${mode === m.key ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <m.icon className="w-4 h-4" /> {m.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"><Cpu className="w-3.5 h-3.5" /> Model</label>
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            className="w-full sm:w-72 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-indigo-500"
          >
            {models.map(m => <option key={m.name} value={m.name}>{m.displayName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Topic</label>
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder={mode === 'lesson' ? 'e.g. How AI accelerates contract review' : mode === 'quiz' ? 'e.g. Key clauses in vendor contracts' : 'e.g. Applying redlining best practices'}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
          />
          <PromptImprover kind={mode === 'lesson' ? 'lesson_topic' : mode === 'quiz' ? 'quiz_topic' : 'assignment'} text={topic} onApply={r => { if (r.improved) setTopic(r.improved); }} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Extra Context <span className="normal-case text-slate-400 font-medium">(optional)</span></label>
          <textarea
            value={context}
            onChange={e => setContext(e.target.value)}
            rows={2}
            placeholder="Audience level, tone, specific points to cover..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
          />
        </div>
        {mode === 'quiz' && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Number of Questions</label>
            <input
              type="number"
              min={1}
              max={15}
              value={numQuestions}
              onChange={e => setNumQuestions(Number(e.target.value))}
              className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
        <button
          onClick={handleGenerate}
          disabled={generating || !topic.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm shadow-sm transition-all"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {mode === 'lesson' && lessonMarkdown && (
        <div className="bg-white border border-indigo-200 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-sm">Generated Lesson Markdown</h4>
            <button onClick={() => copyToClipboard(lessonMarkdown, 'lesson')} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800">
              {copiedField === 'lesson' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />} Copy
            </button>
          </div>
          <textarea
            value={lessonMarkdown}
            onChange={(e) => setLessonMarkdown(e.target.value)}
            rows={10}
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-lg px-4 py-3 text-sm text-slate-700 font-mono transition-all"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target Module</label>
              <select value={targetModuleId} onChange={e => setTargetModuleId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Lesson Title</label>
              <input value={newLessonTitle} onChange={e => setNewLessonTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button
            onClick={createLesson}
            disabled={creating || modules.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg font-bold text-sm shadow-sm transition-all"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />} Create as New Lesson
          </button>
          {modules.length === 0 && <p className="text-xs text-slate-400">Add a module in the Curriculum tab first.</p>}
        </div>
      )}

      {mode === 'quiz' && quizResult && (
        <div className="bg-white border border-indigo-200 rounded-xl p-5 space-y-4 shadow-sm">
          <div>
            <input
              value={quizResult.title}
              onChange={e => setQuizResult({ ...quizResult, title: e.target.value })}
              className="w-full font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none mb-1 text-lg"
            />
            <div className="flex items-center gap-2 text-xs text-slate-500">
              Passing score:
              <input
                type="number"
                value={quizResult.passing_score}
                onChange={e => setQuizResult({ ...quizResult, passing_score: Number(e.target.value) })}
                className="w-16 bg-transparent border-b border-slate-300 focus:border-indigo-500 outline-none px-1"
              />
              % · {quizResult.questions.length} questions
            </div>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {quizResult.questions.map((q, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 relative">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold text-slate-400 mt-2">{i + 1}.</span>
                  <input
                    value={q.question_text}
                    onChange={e => updateQuizQuestion(i, { question_text: e.target.value })}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:border-indigo-500 outline-none"
                  />
                  <button onClick={() => removeQuizQuestion(i)} className="p-2 text-slate-400 hover:text-rose-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2 pl-6">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name={`quiz_q_${i}_correct`}
                        checked={q.correct_answer === opt && !!opt}
                        onChange={() => updateQuizQuestion(i, { correct_answer: opt })}
                        title="Mark as correct"
                        className="cursor-pointer text-emerald-500 focus:ring-emerald-500"
                      />
                      <input
                        value={opt}
                        onChange={e => {
                          const opts = [...q.options]; opts[oi] = e.target.value;
                          const wasCorrect = q.correct_answer === opt;
                          updateQuizQuestion(i, { options: opts, correct_answer: wasCorrect ? e.target.value : q.correct_answer });
                        }}
                        className={`flex-1 border rounded-md px-2 py-1 text-xs outline-none transition-colors ${
                          opt === q.correct_answer ? 'bg-emerald-50 border-emerald-300 text-emerald-800 focus:border-emerald-500' : 'bg-white border-slate-200 focus:border-indigo-500'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target Module</label>
            <select value={targetModuleId} onChange={e => setTargetModuleId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
              {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </div>
          <button
            onClick={createQuiz}
            disabled={creating || modules.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg font-bold text-sm shadow-sm transition-all"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />} Create Quiz
          </button>
        </div>
      )}

      {mode === 'assignment' && assignmentResult && (
        <div className="bg-white border border-indigo-200 rounded-xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-sm">Generated Assignment</h4>
            <button onClick={() => copyToClipboard(assignmentResult.prompt_text, 'assignment')} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800">
              {copiedField === 'assignment' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />} Copy Prompt
            </button>
          </div>
          <textarea
            value={assignmentResult.prompt_text}
            onChange={(e) => setAssignmentResult({ ...assignmentResult, prompt_text: e.target.value })}
            rows={5}
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-lg p-3 text-sm text-slate-700 transition-all"
          />
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>
              Submission type:
              <select
                value={assignmentResult.submission_type}
                onChange={e => setAssignmentResult({ ...assignmentResult, submission_type: e.target.value })}
                className="ml-1 bg-transparent border-b border-slate-300 focus:border-indigo-500 outline-none"
              >
                <option value="text">Text Response</option>
                <option value="file">File Upload</option>
                <option value="both">Text + File</option>
              </select>
            </span>
            <span>
              Max score:
              <input
                type="number"
                value={assignmentResult.max_score}
                onChange={e => setAssignmentResult({ ...assignmentResult, max_score: Number(e.target.value) })}
                className="ml-1 w-16 bg-transparent border-b border-slate-300 focus:border-indigo-500 outline-none text-center"
              />
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target Module</label>
              <select value={targetModuleId} onChange={e => setTargetModuleId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target Lesson</label>
              <select value={targetLessonId} onChange={e => setTargetLessonId(e.target.value)} disabled={loadingLessons || moduleLessons.length === 0} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50">
                {moduleLessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </div>
          </div>
          {moduleLessons.length === 0 && !loadingLessons && (
            <p className="text-xs text-slate-400">Add a lesson to this module in the Curriculum tab first.</p>
          )}
          <button
            onClick={createAssignment}
            disabled={creating || !targetLessonId}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg font-bold text-sm shadow-sm transition-all"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />} Create Assignment
          </button>
          <p className="text-xs text-slate-400 italic">Then add an Assignment block to that lesson in the Curriculum tab — it'll pick up this assignment automatically.</p>
        </div>
      )}
    </div>
  );
}
