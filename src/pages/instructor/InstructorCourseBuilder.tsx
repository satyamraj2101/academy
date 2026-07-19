import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { instructorAPI } from '../../academy/instructorApi';
import { toast } from '../../lib/toast';
import { HapticButton } from '../../components/HapticButton';
import {
  Loader2, ArrowLeft, Plus, Trash2, GripVertical, ChevronDown, ChevronRight, X, Copy,
  FileText, Video, Image as ImageIcon, Presentation, ClipboardCheck, ClipboardList, UploadCloud,
} from 'lucide-react';

interface Course {
  id: string; title: string; description: string; long_description?: string; level: string; duration: string;
  price_usd: number; price_inr: number; category: string; status: string;
}
interface Section { id: string; section_type: string; sort_order: number; content: string }
interface Lesson { id: string; title: string; content_type: string; sort_order: number; module_id: string; sections?: Section[] }
interface ModuleT { id: string; title: string; description: string; sort_order: number; lessons?: Lesson[] }

export function InstructorCourseBuilderComponent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const courseId = id!;

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<ModuleT[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'details' | 'curriculum'>('details');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const data = await instructorAPI.courses.structure(courseId) as { course: Course; structure: ModuleT[] };
      setCourse(data.course);
      setModules(data.structure);
      setExpanded(prev => {
        const next = { ...prev };
        data.structure.forEach(m => { if (!(m.id in next)) next[m.id] = true; });
        return next;
      });
    } catch (e: any) {
      toast.error(e.message || 'Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveDetails = async () => {
    if (!course) return;
    setSaving(true);
    try {
      await instructorAPI.courses.update(course);
      toast.success('Course saved');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  const addModule = async () => {
    const title = window.prompt('Module title?');
    if (!title?.trim()) return;
    try {
      await instructorAPI.modules.create({ course_id: courseId, title: title.trim() });
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add module');
    }
  };

  const deleteModule = async (moduleId: string) => {
    if (!window.confirm('Delete this module and everything in it?')) return;
    try {
      await instructorAPI.modules.delete(moduleId);
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete module');
    }
  };

  const addLesson = async (moduleId: string) => {
    const title = window.prompt('Lesson title?');
    if (!title?.trim()) return;
    try {
      await instructorAPI.lessons.create({ module_id: moduleId, title: title.trim(), content_type: 'blocks' });
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add lesson');
    }
  };

  const deleteLesson = async (lessonId: string) => {
    if (!window.confirm('Delete this lesson?')) return;
    try {
      await instructorAPI.lessons.delete(lessonId);
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete lesson');
    }
  };

  const duplicateCourse = async () => {
    try {
      const res = await instructorAPI.courses.duplicate(courseId) as { id: string };
      toast.success('Course duplicated');
      navigate(`/instructor/courses/${res.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to duplicate course');
    }
  };

  if (loading || !course) return <div className="min-h-screen pt-32 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  if (editingLesson) {
    return (
      <InstructorLessonEditor
        lesson={editingLesson}
        courseId={courseId}
        onClose={() => { setEditingLesson(null); fetchAll(); }}
      />
    );
  }

  return (
    <div className="pt-24 pb-16 min-h-screen bg-surface-50 dark:bg-surface-950">
      <Helmet><title>{course.title} | Instructor</title></Helmet>
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/instructor')} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <button onClick={duplicateCourse} className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold">
              <Copy className="w-4 h-4" /> Duplicate
            </button>
          </div>
        </div>

        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
          {(['details', 'curriculum'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'details' && (
          <div className="space-y-5 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Title</label>
              <input value={course.title} onChange={e => setCourse({ ...course, title: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
              <textarea rows={3} value={course.description} onChange={e => setCourse({ ...course, description: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Level</label>
                <select value={course.level} onChange={e => setCourse({ ...course, level: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm">
                  {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Duration</label>
                <input value={course.duration} onChange={e => setCourse({ ...course, duration: e.target.value })} placeholder="e.g. 4 weeks" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                <input value={course.category} onChange={e => setCourse({ ...course, category: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Price (USD)</label>
                <input type="number" value={course.price_usd / 100} onChange={e => setCourse({ ...course, price_usd: Math.round(parseFloat(e.target.value || '0') * 100) })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
              <select value={course.status} onChange={e => setCourse({ ...course, status: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <HapticButton onClick={saveDetails} disabled={saving} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm">
              {saving ? 'Saving...' : 'Save Details'}
            </HapticButton>
          </div>
        )}

        {tab === 'curriculum' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={addModule} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm">
                <Plus className="w-4 h-4" /> Add Module
              </button>
            </div>
            {modules.map((m, mi) => (
              <div key={m.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <button onClick={() => setExpanded(p => ({ ...p, [m.id]: !p[m.id] }))} className="text-slate-500">
                    {expanded[m.id] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex-1">Module {mi + 1}: {m.title}</h4>
                  <button onClick={() => deleteModule(m.id)} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
                {expanded[m.id] && (
                  <div className="p-4 space-y-2">
                    {m.lessons?.map((l, li) => (
                      <div key={l.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
                        <GripVertical className="w-4 h-4 text-slate-300" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">{li + 1}. {l.title}</span>
                        <button onClick={() => setEditingLesson(l)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1">Edit Content</button>
                        <button onClick={() => deleteLesson(l.id)} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button onClick={() => addLesson(m.id)} className="w-full py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 hover:border-indigo-300 text-sm font-bold flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" /> Add Lesson
                    </button>
                  </div>
                )}
              </div>
            ))}
            {modules.length === 0 && (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <p className="text-slate-500 mb-4">No modules yet.</p>
                <button onClick={addModule} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm">Add First Module</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type BlockType = 'markdown' | 'video' | 'image' | 'ppt' | 'quiz' | 'assignment';
interface Block { id: string; type: BlockType; content: string }

function InstructorLessonEditor({ lesson, courseId, onClose }: { lesson: Lesson; courseId: string; onClose: () => void }) {
  const [blocks, setBlocks] = useState<Block[]>(
    (lesson.sections || []).sort((a, b) => a.sort_order - b.sort_order).map(s => ({ id: s.id, type: s.section_type as BlockType, content: s.content }))
  );
  const [saving, setSaving] = useState(false);

  const addBlock = (type: BlockType) => {
    setBlocks(prev => [...prev, { id: crypto.randomUUID(), type, content: type === 'quiz' || type === 'assignment' ? '{}' : '' }]);
  };
  const updateBlock = (id: string, content: string) => setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
  const removeBlock = (id: string) => setBlocks(prev => prev.filter(b => b.id !== id));

  const save = async () => {
    setSaving(true);
    try {
      await instructorAPI.lessons.saveSections(lesson.id, blocks.map(b => ({ section_type: b.type, content: b.content, is_mandatory: true })));
      toast.success('Lesson content saved');
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-24 pb-16 min-h-screen bg-surface-50 dark:bg-surface-950">
      <div className="max-w-3xl mx-auto px-6 space-y-6">
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-200">Editing: {lesson.title}</h3>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-800 font-medium text-sm">Cancel</button>
            <HapticButton onClick={save} disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm">
              {saving ? 'Saving...' : 'Save Content'}
            </HapticButton>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {([
            { type: 'markdown' as const, label: 'Text', icon: FileText },
            { type: 'video' as const, label: 'Video', icon: Video },
            { type: 'image' as const, label: 'Image', icon: ImageIcon },
            { type: 'ppt' as const, label: 'Slides', icon: Presentation },
            { type: 'quiz' as const, label: 'Quiz', icon: ClipboardCheck },
            { type: 'assignment' as const, label: 'Assignment', icon: ClipboardList },
          ]).map(({ type, label, icon: Icon }) => (
            <button key={type} onClick={() => addBlock(type)} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300">
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {blocks.map(block => (
            <div key={block.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{block.type}</span>
                <button onClick={() => removeBlock(block.id)} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
              {block.type === 'markdown' && (
                <textarea value={block.content} onChange={e => updateBlock(block.id, e.target.value)} rows={6} placeholder="Write lesson content in Markdown..." className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono" />
              )}
              {(block.type === 'video' || block.type === 'image' || block.type === 'ppt') && (
                <MediaBlock content={block.content} onChange={val => updateBlock(block.id, val)} type={block.type} />
              )}
              {block.type === 'quiz' && <InstructorQuizBlock courseId={courseId} value={block.content} onChange={val => updateBlock(block.id, val)} />}
              {block.type === 'assignment' && <InstructorAssignmentBlock lessonId={lesson.id} value={block.content} onChange={val => updateBlock(block.id, val)} />}
            </div>
          ))}
          {blocks.length === 0 && <p className="text-sm text-slate-400 italic text-center py-8">No content blocks yet — add one above.</p>}
        </div>
      </div>
    </div>
  );
}

function MediaBlock({ content, onChange, type }: { content: string; onChange: (v: string) => void; type: BlockType }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await instructorAPI.upload(file) as { url: string };
      onChange(url);
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        value={content}
        onChange={e => onChange(e.target.value)}
        placeholder={type === 'video' ? 'Paste a YouTube/Vimeo/MP4 URL, or upload...' : type === 'image' ? 'Paste an image URL, or upload...' : 'Paste a PPT/PDF URL, or upload...'}
        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-sm font-medium cursor-pointer shrink-0">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />} Upload
        <input type="file" className="hidden" disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
      </label>
    </div>
  );
}

function InstructorQuizBlock({ courseId, value, onChange }: { courseId: string; value: string; onChange: (v: string) => void }) {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [correctIdx, setCorrectIdx] = useState(0);

  useEffect(() => {
    try { const parsed = JSON.parse(value || '{}'); if (parsed.quizId) setSelectedId(parsed.quizId); } catch { /* ignore */ }
    instructorAPI.quizzes.listForCourse(courseId).then((d: any) => setQuizzes(d.quizzes || [])).catch(() => {});
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedId) instructorAPI.quizzes.get(selectedId).then((d: any) => setQuestions(d.questions || [])).catch(() => {});
  }, [selectedId]);

  const createQuiz = async () => {
    if (!newTitle.trim()) return;
    const res = await instructorAPI.quizzes.create({ course_id: courseId, title: newTitle.trim(), passing_score: 70, max_attempts: 3 }) as { id: string };
    setNewTitle('');
    const list = await instructorAPI.quizzes.listForCourse(courseId) as any;
    setQuizzes(list.quizzes || []);
    setSelectedId(res.id);
    onChange(JSON.stringify({ quizId: res.id }));
  };

  const addQuestion = async () => {
    const clean = qOptions.map(o => o.trim()).filter(Boolean);
    if (!qText.trim() || clean.length < 2) { toast.error('Enter a question and 2+ options'); return; }
    await instructorAPI.quizQuestions.create({ quiz_id: selectedId, question_text: qText.trim(), question_type: 'mcq', options: clean, correct_answer: qOptions[correctIdx].trim(), points: 1 });
    setQText(''); setQOptions(['', '', '', '']); setCorrectIdx(0);
    const d = await instructorAPI.quizzes.get(selectedId) as any;
    setQuestions(d.questions || []);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select value={selectedId} onChange={e => { setSelectedId(e.target.value); onChange(JSON.stringify({ quizId: e.target.value })); }} className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm">
          <option value="">Select a quiz...</option>
          {quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
        </select>
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="New quiz title" className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm" />
        <button onClick={createQuiz} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shrink-0">Create</button>
      </div>
      {selectedId && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 space-y-2">
          {questions.map((q, i) => <p key={q.id} className="text-xs text-slate-600 dark:text-slate-400">{i + 1}. {q.question_text}</p>)}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
            <input value={qText} onChange={e => setQText(e.target.value)} placeholder="New question text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm" />
            {qOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" checked={correctIdx === i} onChange={() => setCorrectIdx(i)} />
                <input value={opt} onChange={e => setQOptions(o => o.map((v, idx) => idx === i ? e.target.value : v))} placeholder={`Option ${i + 1}`} className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1 text-xs" />
              </div>
            ))}
            <button onClick={addQuestion} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold">Add Question</button>
          </div>
        </div>
      )}
    </div>
  );
}

function InstructorAssignmentBlock({ lessonId, value, onChange }: { lessonId: string; value: string; onChange: (v: string) => void }) {
  const [promptText, setPromptText] = useState('');
  const [submissionType, setSubmissionType] = useState<'text' | 'file' | 'both'>('text');
  const [maxScore, setMaxScore] = useState(100);
  const [saved, setSaved] = useState(!!(() => { try { return JSON.parse(value || '{}').assignmentId; } catch { return false; } })());

  const save = async () => {
    if (!promptText.trim()) { toast.error('Enter the assignment prompt'); return; }
    const res = await instructorAPI.assignments.create({ lesson_id: lessonId, prompt_text: promptText, submission_type: submissionType, max_score: maxScore }) as { id: string };
    onChange(JSON.stringify({ assignmentId: res.id }));
    setSaved(true);
    toast.success('Assignment saved');
  };

  if (saved) return <p className="text-xs text-slate-400 italic">Assignment attached.</p>;

  return (
    <div className="space-y-3">
      <textarea value={promptText} onChange={e => setPromptText(e.target.value)} rows={3} placeholder="What should students submit?" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm" />
      <div className="flex gap-3">
        <select value={submissionType} onChange={e => setSubmissionType(e.target.value as any)} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm">
          <option value="text">Text</option>
          <option value="file">File</option>
          <option value="both">Text + File</option>
        </select>
        <input type="number" value={maxScore} onChange={e => setMaxScore(Number(e.target.value))} className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm" />
        <button onClick={save} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold">Save Assignment</button>
      </div>
    </div>
  );
}
