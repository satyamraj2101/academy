import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, BookOpen, ChevronDown, RefreshCw } from 'lucide-react';
import { adminFetch } from '../../hooks/useD1Query';
import { useGeminiModels } from '../../hooks/useGeminiModels';
import { toast } from '../../../lib/toast';
import { PromptImprover, type Applied } from '../../components/PromptImprover';

interface OutlineLesson { title: string; summary: string }
interface OutlineQuizQuestion { question_text: string; options: string[]; correct_answer: string; explanation?: string }
interface OutlineQuiz { title: string; passing_score: number; questions: OutlineQuizQuestion[] }
interface OutlineAssignment { prompt_text: string; submission_type: 'text' | 'file' | 'both'; max_score: number }
interface OutlineModule { title: string; description: string; lessons: OutlineLesson[]; quiz?: OutlineQuiz; assignment?: OutlineAssignment }
interface Outline {
  title: string;
  description: string;
  level: string;
  category: string;
  modules: OutlineModule[];
}

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const TONES = ['Professional & concise', 'Conversational & friendly', 'Rigorous & academic', 'Practical & example-driven'];

export default function CourseWizardPage() {
  const navigate = useNavigate();
  const { models, selectedModel, setSelectedModel } = useGeminiModels();

  const [step, setStep] = useState<'brief' | 'preview'>('brief');
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [outline, setOutline] = useState<Outline | null>(null);

  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [level, setLevel] = useState('Beginner');
  const [goal, setGoal] = useState('');
  const [numModules, setNumModules] = useState(4);
  const [duration, setDuration] = useState('4 weeks');
  const [tone, setTone] = useState(TONES[0]);

  const [priceUsd, setPriceUsd] = useState('0');
  const [priceInr, setPriceInr] = useState('0');
  const [bannerUrl, setBannerUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  const canGenerate = topic.trim() && audience.trim() && goal.trim();

  // The improver hands back the brief's fields; the level and tone boxes only accept their listed choices.
  const applyBrief = (r: Applied) => {
    const f = r.improvedFields;
    if (!f) return;
    setTopic(f.topic ?? ''); setAudience(f.audience ?? ''); setGoal(f.goal ?? ''); if (f.duration) setDuration(f.duration);
    const lv = LEVELS.find(l => l.toLowerCase() === (f.level || '').toLowerCase()); if (lv) setLevel(lv);
    const tn = TONES.find(t => t.toLowerCase() === (f.tone || '').toLowerCase()); if (tn) setTone(tn);
  };

  const generate = async () => {
    if (!canGenerate) {
      toast.error('Please fill in Topic, Audience, and Goal — these are required for a good outline.');
      return;
    }
    setGenerating(true);
    try {
      const data = await adminFetch('/academy/gemini-generate-course', {
        method: 'POST',
        body: JSON.stringify({ topic, audience, level, goal, numModules, duration, tone, model: selectedModel }),
      }) as Outline & { success: boolean };
      setOutline(data);
      setStep('preview');
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate course outline');
    } finally {
      setGenerating(false);
    }
  };

  const createCourse = async () => {
    if (!outline) return;
    setCreating(true);
    try {
      const courseRes = await adminFetch('/academy/courses', {
        method: 'POST',
        body: JSON.stringify({
          title: outline.title,
          description: outline.description,
          level: outline.level,
          duration,
          category: outline.category,
          status: 'draft',
          price_usd: Math.round((Number(priceUsd) || 0) * 100),
          price_inr: Math.round((Number(priceInr) || 0) * 100),
          banner_url: bannerUrl || undefined,
          thumbnail_url: thumbnailUrl || undefined,
        }),
      }) as { id: string };

      for (const mod of outline.modules) {
        const modRes = await adminFetch('/academy/modules', {
          method: 'POST',
          body: JSON.stringify({ course_id: courseRes.id, title: mod.title, description: mod.description }),
        }) as { id: string };

        let lastLessonId: string | null = null;
        for (const lesson of mod.lessons) {
          const lessonRes = await adminFetch('/academy/lessons', {
            method: 'POST',
            body: JSON.stringify({ module_id: modRes.id, title: lesson.title, content_type: 'blocks' }),
          }) as { id: string };
          lastLessonId = lessonRes.id;

          await adminFetch(`/academy/lessons/${lessonRes.id}/sections`, {
            method: 'PUT',
            body: JSON.stringify({ sections: [{ section_type: 'markdown', content: `> ${lesson.summary}\n\n*Use the AI Studio tab in this course to draft full lesson content.*`, is_mandatory: true }] }),
          });
        }

        // Attach the generated quiz/assignment to the module's last lesson so
        // students hit them right after working through that module's content.
        if (lastLessonId && (mod.quiz || mod.assignment)) {
          const extraSections: Array<{ section_type: string; content: string; is_mandatory: boolean }> = [];

          if (mod.quiz && mod.quiz.questions?.length) {
            const quizRes = await adminFetch('/academy/quizzes', {
              method: 'POST',
              body: JSON.stringify({ course_id: courseRes.id, module_id: modRes.id, title: mod.quiz.title, passing_score: mod.quiz.passing_score, max_attempts: 3 }),
            }) as { id: string };

            for (const q of mod.quiz.questions) {
              await adminFetch('/academy/quiz-questions', {
                method: 'POST',
                body: JSON.stringify({ quiz_id: quizRes.id, question_text: q.question_text, question_type: 'mcq', options: q.options, correct_answer: q.correct_answer, explanation: q.explanation, points: 1 }),
              });
            }

            extraSections.push({ section_type: 'quiz', content: JSON.stringify({ quizId: quizRes.id }), is_mandatory: true });
          }

          if (mod.assignment) {
            const assignmentRes = await adminFetch('/academy/assignments', {
              method: 'POST',
              body: JSON.stringify({ lesson_id: lastLessonId, prompt_text: mod.assignment.prompt_text, submission_type: mod.assignment.submission_type, max_score: mod.assignment.max_score }),
            }) as { id: string };

            extraSections.push({ section_type: 'assignment', content: JSON.stringify({ assignmentId: assignmentRes.id }), is_mandatory: true });
          }

          if (extraSections.length) {
            await adminFetch(`/academy/lessons/${lastLessonId}/sections`, {
              method: 'PUT',
              body: JSON.stringify({
                sections: [
                  { section_type: 'markdown', content: `> ${mod.lessons[mod.lessons.length - 1]?.summary || ''}\n\n*Use the AI Studio tab in this course to draft full lesson content.*`, is_mandatory: true },
                  ...extraSections,
                ],
              }),
            });
          }
        }
      }

      toast.success('Course created! Opening the Course Builder...');
      navigate(`/admin/academy/courses/${courseRes.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create course from outline');
      setCreating(false);
    }
  };

  const updateModuleField = (idx: number, field: 'title' | 'description', val: string) => {
    if (!outline) return;
    const modules = [...outline.modules];
    modules[idx] = { ...modules[idx], [field]: val };
    setOutline({ ...outline, modules });
  };

  const updateLessonField = (mIdx: number, lIdx: number, field: 'title' | 'summary', val: string) => {
    if (!outline) return;
    const modules = [...outline.modules];
    const lessons = [...modules[mIdx].lessons];
    lessons[lIdx] = { ...lessons[lIdx], [field]: val };
    modules[mIdx] = { ...modules[mIdx], lessons };
    setOutline({ ...outline, modules });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/academy/courses')}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 flex items-center gap-2 min-w-0"> <span className="truncate">AI Course Wizard</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Answer a few questions and get a full course outline to review and edit.</p>
        </div>
      </div>

      {step === 'brief' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs font-medium text-slate-500">Gemini Model</span>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
              >
                {models.map(m => <option key={m.name} value={m.name}>{m.displayName}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Topic <span className="text-rose-500">*</span></label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Contract Redlining Fundamentals"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-base sm:text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Target Audience <span className="text-rose-500">*</span></label>
            <input
              value={audience}
              onChange={e => setAudience(e.target.value)}
              placeholder="e.g. In-house legal counsel new to CLM tools"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-base sm:text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Primary Goal / Outcome <span className="text-rose-500">*</span></label>
            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              rows={2}
              placeholder="e.g. Learners should be able to independently identify and negotiate the top 10 riskiest clauses"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-base sm:text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <PromptImprover kind="course_brief" fields={{ topic, audience, level, goal, duration, tone }} onApply={applyBrief} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Level</label>
              <select
                value={level}
                onChange={e => setLevel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-base sm:text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2"># Modules</label>
              <input
                type="number"
                min={2}
                max={10}
                value={numModules}
                onChange={e => setNumModules(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-base sm:text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Approximate Duration</label>
              <input
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="e.g. 4 weeks"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-base sm:text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Tone / Style</label>
              <select
                value={tone}
                onChange={e => setTone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-base sm:text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                {TONES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={generate}
            disabled={generating || !canGenerate}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium text-sm shadow-sm transition-colors"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {generating ? 'Designing your course...' : 'Generate Course Outline'}
          </button>
        </div>
      )}

      {step === 'preview' && outline && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Outline ready — review &amp; edit before creating
              </span>
              <button
                onClick={() => { setStep('brief'); }}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Start over
              </button>
            </div>
            <input
              value={outline.title}
              onChange={e => setOutline({ ...outline, title: e.target.value })}
              className="w-full text-lg font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none pb-1"
            />
            <textarea
              value={outline.description}
              onChange={e => setOutline({ ...outline, description: e.target.value })}
              rows={2}
              className="w-full text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">{outline.level}</span>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">{outline.category}</span>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">{outline.modules.length} modules</span>
            </div>
          </div>

          {outline.modules.map((mod, mIdx) => (
            <div key={mIdx} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3">
              <div className="flex items-start gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center mt-0.5">{mIdx + 1}</span>
                <div className="flex-1 min-w-0 space-y-2">
                  <input
                    value={mod.title}
                    onChange={e => updateModuleField(mIdx, 'title', e.target.value)}
                    className="w-full font-medium text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                  <input
                    value={mod.description}
                    onChange={e => updateModuleField(mIdx, 'description', e.target.value)}
                    className="w-full text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="pl-8 space-y-2">
                {mod.lessons.map((lesson, lIdx) => (
                  <div key={lIdx} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
                    <input
                      value={lesson.title}
                      onChange={e => updateLessonField(mIdx, lIdx, 'title', e.target.value)}
                      className="w-full text-sm font-semibold text-slate-800 bg-transparent focus:outline-none"
                    />
                    <input
                      value={lesson.summary}
                      onChange={e => updateLessonField(mIdx, lIdx, 'summary', e.target.value)}
                      className="w-full text-xs text-slate-500 bg-transparent focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
            <h3 className="text-sm font-medium text-slate-800">Pricing &amp; Branding</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">Price (USD)</label>
                <input
                  type="number"
                  min={0}
                  value={priceUsd}
                  onChange={e => setPriceUsd(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">Price (INR)</label>
                <input
                  type="number"
                  min={0}
                  value={priceInr}
                  onChange={e => setPriceInr(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Banner Image URL (optional)</label>
              <input
                value={bannerUrl}
                onChange={e => setBannerUrl(e.target.value)}
                placeholder="Paste an image URL, or set this later in the Course Builder"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Thumbnail Image URL (optional)</label>
              <input
                value={thumbnailUrl}
                onChange={e => setThumbnailUrl(e.target.value)}
                placeholder="Paste an image URL, or set this later in the Course Builder"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            onClick={createCourse}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-medium text-sm shadow-sm transition-colors sticky bottom-4"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            {creating ? 'Creating course & curriculum...' : 'Create This Course'}
            {!creating && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
}
