import { useState, useEffect } from 'react';
import { Image as ImageIcon, ClipboardCheck, ClipboardList, Plus, Trash2, Loader2, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { adminFetch } from '../../hooks/useD1Query';
import { toast } from '../../../lib/toast';
import { AssetManagerModal } from '../../components/builder/AssetManagerModal';
import { useGeminiModels } from '../../hooks/useGeminiModels';

interface QuizQuestion {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
  points?: number;
}

interface QuizTemplate {
  id: string;
  title: string;
  passing_score: number;
  max_attempts: number;
  questions: QuizQuestion[];
  created_at: string;
}

interface AssignmentTemplate {
  id: string;
  title: string;
  prompt_text: string;
  submission_type: string;
  max_score: number;
  created_at: string;
}

export default function LibraryPage() {
  const [tab, setTab] = useState<'assets' | 'quizzes' | 'assignments'>('assets');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Content Library</h1>
        <p className="text-sm text-slate-500 mt-1">Assets, quizzes, and assignments you've built — reusable across every course, from anywhere in the admin panel.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto">
        {([
          { key: 'assets', label: 'Assets', icon: ImageIcon },
          { key: 'quizzes', label: 'Quiz Templates', icon: ClipboardCheck },
          { key: 'assignments', label: 'Assignment Templates', icon: ClipboardList },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm min-h-[400px]">
        {tab === 'assets' && (
          <AssetManagerModal
            inline
            onClose={() => {}}
            onSelect={(url) => {
              navigator.clipboard.writeText(url.startsWith('http') ? url : window.location.origin + url);
              toast.success('Asset URL copied to clipboard');
            }}
          />
        )}
        {tab === 'quizzes' && <QuizTemplatesPanel />}
        {tab === 'assignments' && <AssignmentTemplatesPanel />}
      </div>
    </div>
  );
}

function QuizTemplatesPanel() {
  const { models, selectedModel, setSelectedModel } = useGeminiModels();
  const [templates, setTemplates] = useState<QuizTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [saving, setSaving] = useState(false);

  const [aiTopic, setAiTopic] = useState('');
  const [aiNumQuestions, setAiNumQuestions] = useState(5);
  const [generating, setGenerating] = useState(false);

  const fetchTemplates = () => {
    setLoading(true);
    adminFetch('/academy/quiz-templates')
      .then((data: any) => setTemplates(data.templates || []))
      .catch((e: any) => toast.error(e.message || 'Failed to load quiz templates'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTemplates(); }, []);

  const resetForm = () => {
    setTitle(''); setPassingScore(70); setMaxAttempts(3); setQuestions([]); setAiTopic('');
  };

  const generateWithAi = async () => {
    if (!aiTopic.trim()) { toast.error('Enter a topic first'); return; }
    setGenerating(true);
    try {
      const res = await adminFetch('/academy/gemini-generate', {
        method: 'POST',
        body: JSON.stringify({ mode: 'quiz', topic: aiTopic, numQuestions: aiNumQuestions, model: selectedModel }),
      }) as any;
      setTitle(res.title || aiTopic);
      setPassingScore(res.passing_score ?? 70);
      setQuestions(res.questions || []);
      toast.success('Questions generated — review and save below');
    } catch (e: any) {
      toast.error(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const addBlankQuestion = () => {
    setQuestions(prev => [...prev, { question_text: '', options: ['', '', '', ''], correct_answer: '', points: 1 }]);
  };

  const updateQuestion = (i: number, patch: Partial<QuizQuestion>) => {
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  };

  const removeQuestion = (i: number) => {
    setQuestions(prev => prev.filter((_, idx) => idx !== i));
  };

  const saveTemplate = async () => {
    if (!title.trim()) { toast.error('Enter a title'); return; }
    const clean = questions.filter(q => q.question_text.trim() && q.correct_answer.trim() && q.options.filter(o => o.trim()).length >= 2);
    if (clean.length === 0) { toast.error('Add at least one complete question'); return; }
    setSaving(true);
    try {
      await adminFetch('/academy/quiz-templates', {
        method: 'POST',
        body: JSON.stringify({ title, passing_score: passingScore, max_attempts: maxAttempts, questions: clean }),
      });
      toast.success('Quiz template saved');
      setShowCreate(false);
      resetForm();
      fetchTemplates();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      await adminFetch(`/academy/quiz-templates?id=${id}`, { method: 'DELETE' });
      toast.success('Template deleted');
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Reusable quiz templates. Use the "Use Template" button inside any Quiz block in a course to instantiate one instantly.</p>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all shrink-0">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <p className="text-slate-500">No quiz templates yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.map(t => (
            <div key={t.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-slate-800">{t.title}</h4>
                <button onClick={() => deleteTemplate(t.id)} className="text-slate-400 hover:text-rose-500 p-1 -m-1 shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Passing: {t.passing_score}% · {t.questions.length} question{t.questions.length === 1 ? '' : 's'}</p>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white sm:rounded-2xl w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <h2 className="text-lg font-bold text-slate-800">New Quiz Template</h2>
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="p-2 -mr-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
                <p className="flex items-center gap-1.5 text-xs font-bold text-violet-700 uppercase tracking-wider"><Sparkles className="w-3.5 h-3.5" /> Generate with AI (optional)</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="Topic, e.g. NDA red flags" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  <input type="number" min={1} max={15} value={aiNumQuestions} onChange={e => setAiNumQuestions(Number(e.target.value))} className="w-full sm:w-20 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs">
                    {models.map(m => <option key={m.name} value={m.name}>{m.displayName}</option>)}
                  </select>
                  <button onClick={generateWithAi} disabled={generating} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm shrink-0">
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Title</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Passing Score %</label>
                  <input type="number" value={passingScore} onChange={e => setPassingScore(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Max Attempts</label>
                  <input type="number" value={maxAttempts} onChange={e => setMaxAttempts(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <input
                        value={q.question_text}
                        onChange={e => updateQuestion(i, { question_text: e.target.value })}
                        placeholder={`Question ${i + 1}`}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      />
                      <button onClick={() => removeQuestion(i)} className="text-slate-400 hover:text-rose-500 p-2 shrink-0"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[0, 1, 2, 3].map(oi => (
                        <div key={oi} className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            checked={q.correct_answer === q.options[oi] && !!q.options[oi]}
                            onChange={() => updateQuestion(i, { correct_answer: q.options[oi] })}
                            title="Mark as correct"
                          />
                          <input
                            value={q.options[oi] || ''}
                            onChange={e => {
                              const opts = [...q.options]; opts[oi] = e.target.value;
                              const wasCorrect = q.correct_answer === q.options[oi];
                              updateQuestion(i, { options: opts, correct_answer: wasCorrect ? e.target.value : q.correct_answer });
                            }}
                            placeholder={`Option ${oi + 1}`}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={addBlankQuestion} className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-lg text-slate-500 hover:text-indigo-600 text-sm font-bold flex items-center justify-center gap-2 transition-colors bg-slate-50 hover:bg-indigo-50">
                  <Plus className="w-4 h-4" /> Add Question Manually
                </button>
              </div>
            </div>
            <div className="px-5 sm:px-6 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="px-4 py-2.5 sm:py-2 text-slate-600 hover:text-slate-900 font-medium text-sm">Cancel</button>
              <button onClick={saveTemplate} disabled={saving} className="px-4 py-2.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssignmentTemplatesPanel() {
  const { models, selectedModel, setSelectedModel } = useGeminiModels();
  const [templates, setTemplates] = useState<AssignmentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState('');
  const [promptText, setPromptText] = useState('');
  const [submissionType, setSubmissionType] = useState<'text' | 'file' | 'both'>('text');
  const [maxScore, setMaxScore] = useState(100);
  const [saving, setSaving] = useState(false);

  const [aiTopic, setAiTopic] = useState('');
  const [generating, setGenerating] = useState(false);

  const fetchTemplates = () => {
    setLoading(true);
    adminFetch('/academy/assignment-templates')
      .then((data: any) => setTemplates(data.templates || []))
      .catch((e: any) => toast.error(e.message || 'Failed to load assignment templates'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTemplates(); }, []);

  const resetForm = () => { setTitle(''); setPromptText(''); setSubmissionType('text'); setMaxScore(100); setAiTopic(''); };

  const generateWithAi = async () => {
    if (!aiTopic.trim()) { toast.error('Enter a topic first'); return; }
    setGenerating(true);
    try {
      const res = await adminFetch('/academy/gemini-generate', {
        method: 'POST',
        body: JSON.stringify({ mode: 'assignment', topic: aiTopic, model: selectedModel }),
      }) as any;
      setTitle(aiTopic);
      setPromptText(res.prompt_text || '');
      setSubmissionType(res.submission_type || 'text');
      setMaxScore(res.max_score ?? 100);
      toast.success('Assignment generated — review and save below');
    } catch (e: any) {
      toast.error(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const saveTemplate = async () => {
    if (!title.trim() || !promptText.trim()) { toast.error('Title and prompt are required'); return; }
    setSaving(true);
    try {
      await adminFetch('/academy/assignment-templates', {
        method: 'POST',
        body: JSON.stringify({ title, prompt_text: promptText, submission_type: submissionType, max_score: maxScore }),
      });
      toast.success('Assignment template saved');
      setShowCreate(false);
      resetForm();
      fetchTemplates();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      await adminFetch(`/academy/assignment-templates?id=${id}`, { method: 'DELETE' });
      toast.success('Template deleted');
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Reusable assignment prompts. Use the "Use Template" button inside any Assignment block in a course to pre-fill it instantly.</p>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all shrink-0">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <p className="text-slate-500">No assignment templates yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.map(t => (
            <div key={t.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-slate-800">{t.title}</h4>
                <button onClick={() => deleteTemplate(t.id)} className="text-slate-400 hover:text-rose-500 p-1 -m-1 shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>
              <p className="text-sm text-slate-600 mt-2 line-clamp-3">{t.prompt_text}</p>
              <p className="text-xs text-slate-500 mt-2">{t.submission_type} · {t.max_score} pts</p>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white sm:rounded-2xl w-full h-full sm:h-auto sm:max-w-xl sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <h2 className="text-lg font-bold text-slate-800">New Assignment Template</h2>
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="p-2 -mr-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
                <p className="flex items-center gap-1.5 text-xs font-bold text-violet-700 uppercase tracking-wider"><Sparkles className="w-3.5 h-3.5" /> Generate with AI (optional)</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="Topic, e.g. Drafting a limitation of liability clause" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs">
                    {models.map(m => <option key={m.name} value={m.name}>{m.displayName}</option>)}
                  </select>
                  <button onClick={generateWithAi} disabled={generating} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm shrink-0">
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Prompt</label>
                <textarea value={promptText} onChange={e => setPromptText(e.target.value)} rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Submission Type</label>
                  <select value={submissionType} onChange={e => setSubmissionType(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    <option value="text">Text Response</option>
                    <option value="file">File Upload</option>
                    <option value="both">Text + File</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Max Score</label>
                  <input type="number" value={maxScore} onChange={e => setMaxScore(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div className="px-5 sm:px-6 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="px-4 py-2.5 sm:py-2 text-slate-600 hover:text-slate-900 font-medium text-sm">Cancel</button>
              <button onClick={saveTemplate} disabled={saving} className="px-4 py-2.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
