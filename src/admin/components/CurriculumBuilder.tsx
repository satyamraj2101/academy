import { useState, useEffect, useRef } from 'react';
import { Plus, GripVertical, Video, FileText, Trash2, Edit2, Loader2, ChevronDown, ChevronRight, X, Layers, Download, Upload, Settings, Eye, EyeOff, Clock } from 'lucide-react';

import { LessonBlockEditor, LessonBlock } from './builder/LessonBlockEditor';
import { adminFetch } from '../hooks/useD1Query';
import { toast } from '../../lib/toast';
import { exportCourseZip } from '../utils/exportCourseZip';

interface Section {
  id: string;
  lesson_id: string;
  section_type: 'markdown' | 'video' | 'image' | 'ppt' | 'quiz' | 'assignment';
  content: string;
  sort_order: number;
}

interface Lesson {
  id: string;
  title: string;
  content_type: string;
  sort_order: number;
  module_id: string;
  sections?: Section[];
  is_preview?: number;
  is_published?: number;
  drip_days?: number | null;
  unlock_date?: string | null;
}

interface Module {
  id: string;
  title: string;
  description: string;
  sort_order: number;
  lessons?: Lesson[];
  is_published?: number;
  drip_days?: number | null;
  unlock_date?: string | null;
}

function InlineNameModal({ title, label, placeholder, onCancel, onSubmit }: {
  title: string; label: string; placeholder: string;
  onCancel: () => void; onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onCancel} className="p-2 -mr-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (value.trim()) onSubmit(value.trim()); }}
          className="p-5 sm:p-6 space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</label>
            <input
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 sm:py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-base sm:text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pb-1 sm:pb-0">
            <button type="button" onClick={onCancel} className="px-4 py-2.5 sm:py-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!value.trim()} className="px-4 py-2.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg font-bold text-sm shadow-sm transition-all">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModuleSettingsModal({ module, onCancel, onSave }: {
  module: Module; onCancel: () => void; onSave: (patch: { is_published: boolean; drip_days: number | null; unlock_date: string | null }) => void;
}) {
  const [isPublished, setIsPublished] = useState(module.is_published !== 0);
  const [dripDays, setDripDays] = useState(module.drip_days != null ? String(module.drip_days) : '');
  const [unlockDate, setUnlockDate] = useState(module.unlock_date ? module.unlock_date.slice(0, 10) : '');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-800">Module Settings: {module.title}</h3>
          <button onClick={onCancel} className="p-2 -mr-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-bold text-slate-700">Published</span>
            <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="w-5 h-5 accent-indigo-600" />
          </label>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Drip Delay (days after enrollment)</label>
            <input
              type="number"
              min={0}
              value={dripDays}
              onChange={e => setDripDays(e.target.value)}
              placeholder="Unlocked immediately"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fixed Unlock Date (optional)</label>
            <input
              type="date"
              value={unlockDate}
              onChange={e => setUnlockDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onCancel} className="px-4 py-2.5 sm:py-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors">Cancel</button>
            <button
              onClick={() => onSave({ is_published: isPublished, drip_days: dripDays ? Number(dripDays) : null, unlock_date: unlockDate || null })}
              className="px-4 py-2.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LessonSettingsModal({ lesson, onCancel, onSave }: {
  lesson: Lesson; onCancel: () => void;
  onSave: (patch: { is_preview: boolean; is_published: boolean; drip_days: number | null; unlock_date: string | null }) => void;
}) {
  const [isPreview, setIsPreview] = useState(!!lesson.is_preview);
  const [isPublished, setIsPublished] = useState(lesson.is_published !== 0);
  const [dripDays, setDripDays] = useState(lesson.drip_days != null ? String(lesson.drip_days) : '');
  const [unlockDate, setUnlockDate] = useState(lesson.unlock_date ? lesson.unlock_date.slice(0, 10) : '');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-800">Lesson Settings: {lesson.title}</h3>
          <button onClick={onCancel} className="p-2 -mr-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-bold text-slate-700">Free Preview (accessible without enrollment)</span>
            <input type="checkbox" checked={isPreview} onChange={e => setIsPreview(e.target.checked)} className="w-5 h-5 accent-indigo-600 shrink-0 ml-3" />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-bold text-slate-700">Published</span>
            <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="w-5 h-5 accent-indigo-600" />
          </label>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Drip Delay (days after enrollment)</label>
            <input
              type="number"
              min={0}
              value={dripDays}
              onChange={e => setDripDays(e.target.value)}
              placeholder="Unlocked immediately"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fixed Unlock Date (optional)</label>
            <input
              type="date"
              value={unlockDate}
              onChange={e => setUnlockDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onCancel} className="px-4 py-2.5 sm:py-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors">Cancel</button>
            <button
              onClick={() => onSave({ is_preview: isPreview, is_published: isPublished, drip_days: dripDays ? Number(dripDays) : null, unlock_date: unlockDate || null })}
              className="px-4 py-2.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ title, message, onCancel, onConfirm }: {
  title: string; message: string; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl overflow-hidden">
        <div className="p-5 sm:p-6 space-y-4">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <p className="text-sm text-slate-500">{message}</p>
          <div className="flex justify-end gap-3 pt-2 pb-1 sm:pb-0">
            <button onClick={onCancel} className="px-4 py-2.5 sm:py-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors">
              Cancel
            </button>
            <button onClick={onConfirm} className="px-4 py-2.5 sm:py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CurriculumBuilder({ courseId, courseTitle }: { courseId: string; courseTitle?: string }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonBlocks, setLessonBlocks] = useState<LessonBlock[]>([]);
  const [savingLesson, setSavingLesson] = useState(false);

  const [showAddModule, setShowAddModule] = useState(false);
  const [addLessonForModule, setAddLessonForModule] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ type: 'module' | 'lesson'; id: string } | null>(null);
  const [editingModuleSettings, setEditingModuleSettings] = useState<Module | null>(null);
  const [editingLessonSettings, setEditingLessonSettings] = useState<Lesson | null>(null);

  const [dragModuleId, setDragModuleId] = useState<string | null>(null);
  const [dragLesson, setDragLesson] = useState<{ id: string; moduleId: string } | null>(null);

  useEffect(() => {
    fetchModules();
  }, [courseId]);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const data = await adminFetch(`/academy/courses/${courseId}/structure`) as { success: boolean; structure: Module[] };
      if (data.success && data.structure) {
        setModules(data.structure);
        setExpandedModules(prev => {
          const expanded = { ...prev };
          data.structure.forEach((m: Module) => { if (!(m.id in expanded)) expanded[m.id] = true; });
          return expanded;
        });
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to load curriculum');
    } finally {
      setLoading(false);
    }
  };

  const createModule = async (title: string) => {
    try {
      await adminFetch('/academy/modules', {
        method: 'POST',
        body: JSON.stringify({ course_id: courseId, title, description: '' })
      });
      toast.success('Module added');
      setShowAddModule(false);
      fetchModules();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add module');
    }
  };

  const createLesson = async (moduleId: string, title: string) => {
    try {
      await adminFetch('/academy/lessons', {
        method: 'POST',
        body: JSON.stringify({ module_id: moduleId, title, content_type: 'blocks' })
      });
      toast.success('Lesson added');
      setAddLessonForModule(null);
      fetchModules();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add lesson');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { type, id } = pendingDelete;
    try {
      await adminFetch(`/academy/${type === 'module' ? 'modules' : 'lessons'}?id=${id}`, { method: 'DELETE' });
      toast.success(`${type === 'module' ? 'Module' : 'Lesson'} deleted`);
      fetchModules();
    } catch (e: any) {
      toast.error(e.message || `Failed to delete ${type}`);
    } finally {
      setPendingDelete(null);
    }
  };

  const saveModuleSettings = async (patch: { is_published: boolean; drip_days: number | null; unlock_date: string | null }) => {
    if (!editingModuleSettings) return;
    try {
      await adminFetch('/academy/modules', {
        method: 'PUT',
        body: JSON.stringify({
          id: editingModuleSettings.id,
          title: editingModuleSettings.title,
          description: editingModuleSettings.description,
          sort_order: editingModuleSettings.sort_order,
          is_published: patch.is_published ? 1 : 0,
          drip_days: patch.drip_days,
          unlock_date: patch.unlock_date,
        }),
      });
      toast.success('Module settings saved');
      setEditingModuleSettings(null);
      fetchModules();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save module settings');
    }
  };

  const saveLessonSettings = async (patch: { is_preview: boolean; is_published: boolean; drip_days: number | null; unlock_date: string | null }) => {
    if (!editingLessonSettings) return;
    try {
      await adminFetch('/academy/lessons', {
        method: 'PUT',
        body: JSON.stringify({
          ...editingLessonSettings,
          is_preview: patch.is_preview ? 1 : 0,
          is_published: patch.is_published ? 1 : 0,
          drip_days: patch.drip_days,
          unlock_date: patch.unlock_date,
        }),
      });
      toast.success('Lesson settings saved');
      setEditingLessonSettings(null);
      fetchModules();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save lesson settings');
    }
  };

  const toggleModule = (id: string) => {
    setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportCourseZip(courseId, courseTitle || 'course');
      toast.success('Course exported');
    } catch (e: any) {
      toast.error(e.message || 'Failed to export course');
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await adminFetch(`/academy/courses/${courseId}/import-zip`, { method: 'POST', body: formData }) as {
        success: boolean; modulesCreated: number; lessonsCreated: number; sectionsCreated: number; warnings: string[];
      };
      toast.success(`Imported ${res.modulesCreated} module(s), ${res.lessonsCreated} lesson(s), ${res.sectionsCreated} content block(s)`);
      if (res.warnings?.length) {
        res.warnings.slice(0, 5).forEach(w => toast.error(w));
      }
      fetchModules();
    } catch (err: any) {
      toast.error(err.message || 'Failed to import zip');
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  // Drag-and-drop reordering — modules across the course, lessons within a module.
  const reorderModules = async (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const ordered = [...modules];
    const fromIdx = ordered.findIndex(m => m.id === fromId);
    const toIdx = ordered.findIndex(m => m.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, moved);
    setModules(ordered);
    try {
      await Promise.all(ordered.map((m, i) =>
        adminFetch('/academy/modules', { method: 'PUT', body: JSON.stringify({ id: m.id, title: m.title, description: m.description, sort_order: i + 1 }) })
      ));
    } catch {
      toast.error('Failed to save new module order');
      fetchModules();
    }
  };

  const reorderLessons = async (moduleId: string, fromId: string, toId: string) => {
    if (fromId === toId) return;
    const moduleIdx = modules.findIndex(m => m.id === moduleId);
    if (moduleIdx === -1) return;
    const lessons = [...(modules[moduleIdx].lessons || [])];
    const fromIdx = lessons.findIndex(l => l.id === fromId);
    const toIdx = lessons.findIndex(l => l.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = lessons.splice(fromIdx, 1);
    lessons.splice(toIdx, 0, moved);

    const newModules = [...modules];
    newModules[moduleIdx] = { ...newModules[moduleIdx], lessons };
    setModules(newModules);

    try {
      await Promise.all(lessons.map((l, i) =>
        adminFetch('/academy/lessons', { method: 'PUT', body: JSON.stringify({ ...l, sort_order: i + 1 }) })
      ));
    } catch {
      toast.error('Failed to save new lesson order');
      fetchModules();
    }
  };

  const moveLessonToModule = async (lessonId: string, fromModuleId: string, toModuleId: string, beforeLessonId?: string) => {
    if (fromModuleId === toModuleId) return;
    const fromIdx = modules.findIndex(m => m.id === fromModuleId);
    const toIdx = modules.findIndex(m => m.id === toModuleId);
    if (fromIdx === -1 || toIdx === -1) return;

    const fromLessons = [...(modules[fromIdx].lessons || [])];
    const lessonIdx = fromLessons.findIndex(l => l.id === lessonId);
    if (lessonIdx === -1) return;
    const [moved] = fromLessons.splice(lessonIdx, 1);

    const toLessons = [...(modules[toIdx].lessons || [])];
    const insertAt = beforeLessonId ? toLessons.findIndex(l => l.id === beforeLessonId) : toLessons.length;
    toLessons.splice(insertAt === -1 ? toLessons.length : insertAt, 0, { ...moved, module_id: toModuleId });

    const newModules = [...modules];
    newModules[fromIdx] = { ...newModules[fromIdx], lessons: fromLessons };
    newModules[toIdx] = { ...newModules[toIdx], lessons: toLessons };
    setModules(newModules);

    try {
      await adminFetch('/academy/lessons', { method: 'PUT', body: JSON.stringify({ ...moved, module_id: toModuleId, sort_order: insertAt === -1 ? toLessons.length : insertAt + 1 }) });
      await Promise.all([
        ...fromLessons.map((l, i) => adminFetch('/academy/lessons', { method: 'PUT', body: JSON.stringify({ ...l, sort_order: i + 1 }) })),
        ...toLessons.filter(l => l.id !== lessonId).map((l, i) => adminFetch('/academy/lessons', { method: 'PUT', body: JSON.stringify({ ...l, sort_order: i + 1 }) })),
      ]);
      toast.success('Lesson moved');
    } catch (e: any) {
      toast.error(e.message || 'Failed to move lesson');
      fetchModules();
    }
  };

  const openLessonEditor = (lesson: Lesson) => {
    setEditingLesson(lesson);
    if (lesson.sections && lesson.sections.length > 0) {
      const blocks: LessonBlock[] = [...lesson.sections]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(s => ({ id: s.id, type: s.section_type as any, content: s.content }));
      setLessonBlocks(blocks);
    } else {
      setLessonBlocks([]);
    }
  };

  const saveLessonBlocks = async () => {
    if (!editingLesson) return;
    setSavingLesson(true);
    try {
      // Single atomic call: replaces every section for this lesson in one
      // batch, so re-saving never duplicates content.
      await adminFetch(`/academy/lessons/${editingLesson.id}/sections`, {
        method: 'PUT',
        body: JSON.stringify({
          sections: lessonBlocks.map(b => ({ section_type: b.type, content: b.content, is_mandatory: true }))
        })
      });
      toast.success('Lesson content saved');
      setEditingLesson(null);
      fetchModules();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save lesson content');
    } finally {
      setSavingLesson(false);
    }
  };

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  if (editingLesson) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-0 z-10 sm:static">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-800 truncate">Editing Lesson: {editingLesson.title}</h3>
            <p className="text-sm text-slate-500 hidden sm:block">Build your lesson content using blocks.</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setEditingLesson(null)} disabled={savingLesson} className="px-4 py-2.5 sm:py-2 text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button onClick={saveLessonBlocks} disabled={savingLesson} className="flex-1 sm:flex-none justify-center px-4 py-2.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm shadow-sm transition-all flex items-center gap-2">
              {savingLesson && <Loader2 className="w-4 h-4 animate-spin" />}
              {savingLesson ? 'Saving...' : 'Save Content'}
            </button>
          </div>
        </div>

        <LessonBlockEditor blocks={lessonBlocks} onChange={setLessonBlocks} courseId={courseId} lessonId={editingLesson.id} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h3 className="text-lg font-bold text-slate-800">Course Curriculum</h3>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input ref={importInputRef} type="file" accept=".zip" className="hidden" onChange={handleImportFile} />
          <button
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            title="Import a zip of numbered Module/Lesson folders to scaffold curriculum instantly"
            className="flex items-center gap-2 px-2.5 sm:px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-xs sm:text-sm shadow-sm transition-colors disabled:opacity-50"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} <span className="hidden sm:inline">Import</span>
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || modules.length === 0}
            title="Download this course's full curriculum, quizzes, assignments, and assets as a zip"
            className="flex items-center gap-2 px-2.5 sm:px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-xs sm:text-sm shadow-sm transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={() => setShowAddModule(true)} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs sm:text-sm shadow-sm transition-all ml-auto sm:ml-0">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add </span>Module
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {modules.map((module, mIndex) => (
          <div
            key={module.id}
            draggable
            onDragStart={() => setDragModuleId(module.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragModuleId) reorderModules(dragModuleId, module.id);
              else if (dragLesson && dragLesson.moduleId !== module.id) moveLessonToModule(dragLesson.id, dragLesson.moduleId, module.id);
              setDragModuleId(null);
              setDragLesson(null);
            }}
            className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${dragModuleId === module.id ? 'opacity-50 border-indigo-300' : 'border-slate-200'}`}
          >
            <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-50 border-b border-slate-200">
              <span className="hidden sm:inline cursor-grab text-slate-400 hover:text-slate-600 shrink-0" title="Drag to reorder">
                <GripVertical className="w-4 h-4" />
              </span>
              <button onClick={() => toggleModule(module.id)} className="text-slate-500 hover:text-slate-800 shrink-0">
                {expandedModules[module.id] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
              <h4 className="font-bold text-slate-800 flex-1 min-w-0 truncate text-sm sm:text-base">Module {mIndex + 1}: {module.title}</h4>
              {(module.drip_days || module.unlock_date) && (
                <span title="Drip-scheduled" className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
                  <Clock className="w-3 h-3" /> {module.drip_days ? `Day ${module.drip_days}` : module.unlock_date}
                </span>
              )}
              {module.is_published === 0 && (
                <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                  <EyeOff className="w-3 h-3" /> Unpublished
                </span>
              )}
              <span className="shrink-0 text-xs font-semibold text-slate-400 bg-slate-100 sm:bg-transparent px-1.5 sm:px-0 py-0.5 sm:py-0 rounded-full">{module.lessons?.length || 0}<span className="hidden sm:inline"> lesson{(module.lessons?.length || 0) === 1 ? '' : 's'}</span></span>
              <button onClick={() => setEditingModuleSettings(module)} className="text-slate-400 hover:text-indigo-600 p-2 -m-1 shrink-0" title="Module settings">
                <Settings className="w-4 h-4" />
              </button>
              <button onClick={() => setPendingDelete({ type: 'module', id: module.id })} className="text-slate-400 hover:text-rose-500 p-2 -m-1 shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {expandedModules[module.id] && (
              <div className="p-4 space-y-2 bg-white">
                {module.lessons?.map((lesson, lIndex) => (
                  <div
                    key={lesson.id}
                    draggable
                    onDragStart={() => setDragLesson({ id: lesson.id, moduleId: module.id })}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (dragLesson) {
                        if (dragLesson.moduleId === module.id) reorderLessons(module.id, dragLesson.id, lesson.id);
                        else moveLessonToModule(dragLesson.id, dragLesson.moduleId, module.id, lesson.id);
                      }
                      setDragLesson(null);
                    }}
                    className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-white rounded-lg border transition-colors shadow-sm ${dragLesson?.id === lesson.id ? 'opacity-50 border-indigo-300' : 'border-slate-200 hover:border-indigo-300'}`}
                  >
                    <span className="hidden sm:inline cursor-grab text-slate-400 hover:text-slate-600 shrink-0" title="Drag to reorder">
                      <GripVertical className="w-4 h-4" />
                    </span>
                    <span className="shrink-0">
                      {lesson.sections?.some(s => s.section_type === 'video') ? <Video className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-emerald-500" />}
                    </span>
                    <span className="text-sm font-medium text-slate-700 flex-1 min-w-0 truncate">{lIndex + 1}. {lesson.title}</span>
                    {!!lesson.is_preview && (
                      <span title="Free preview" className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                        <Eye className="w-3 h-3" /> Preview
                      </span>
                    )}
                    {lesson.is_published === 0 && (
                      <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                        <EyeOff className="w-3 h-3" /> Unpublished
                      </span>
                    )}
                    {(lesson.drip_days || lesson.unlock_date) && (
                      <span title="Drip-scheduled" className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
                        <Clock className="w-3 h-3" /> {lesson.drip_days ? `Day ${lesson.drip_days}` : lesson.unlock_date}
                      </span>
                    )}
                    {lesson.sections && lesson.sections.length > 0 && (
                      <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                        <Layers className="w-3 h-3" /> {lesson.sections.length} block{lesson.sections.length === 1 ? '' : 's'}
                      </span>
                    )}
                    <button onClick={() => setEditingLessonSettings(lesson)} className="text-slate-400 hover:text-indigo-600 p-1.5 sm:p-1 rounded transition-colors shrink-0" title="Lesson settings">
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => openLessonEditor(lesson)} className="text-slate-400 hover:text-indigo-600 p-1.5 sm:p-1 bg-slate-50 hover:bg-indigo-50 rounded transition-colors sm:px-2 flex items-center gap-1 text-xs font-medium shrink-0">
                      <Edit2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Edit Content</span>
                    </button>
                    <button onClick={() => setPendingDelete({ type: 'lesson', id: lesson.id })} className="text-slate-400 hover:text-rose-500 p-2 -m-1 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button onClick={() => setAddLessonForModule(module.id)} className="w-full mt-2 py-3 border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-lg text-slate-500 hover:text-indigo-600 text-sm font-bold flex items-center justify-center gap-2 transition-colors bg-slate-50 hover:bg-indigo-50">
                  <Plus className="w-4 h-4" /> Add Lesson
                </button>
              </div>
            )}
          </div>
        ))}

        {modules.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
            <p className="text-slate-500 mb-4">No modules yet. Start building your course!</p>
            <button onClick={() => setShowAddModule(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-sm mx-auto hover:bg-indigo-100 transition-colors">
              <Plus className="w-4 h-4" /> Add First Module
            </button>
          </div>
        )}
      </div>

      {showAddModule && (
        <InlineNameModal
          title="Add Module"
          label="Module Title"
          placeholder="e.g. Introduction to Contract Lifecycle"
          onCancel={() => setShowAddModule(false)}
          onSubmit={createModule}
        />
      )}
      {addLessonForModule && (
        <InlineNameModal
          title="Add Lesson"
          label="Lesson Title"
          placeholder="e.g. Understanding Approval Workflows"
          onCancel={() => setAddLessonForModule(null)}
          onSubmit={(title) => createLesson(addLessonForModule, title)}
        />
      )}
      {editingModuleSettings && (
        <ModuleSettingsModal
          module={editingModuleSettings}
          onCancel={() => setEditingModuleSettings(null)}
          onSave={saveModuleSettings}
        />
      )}
      {editingLessonSettings && (
        <LessonSettingsModal
          lesson={editingLessonSettings}
          onCancel={() => setEditingLessonSettings(null)}
          onSave={saveLessonSettings}
        />
      )}
      {pendingDelete && (
        <ConfirmDeleteModal
          title={`Delete ${pendingDelete.type === 'module' ? 'Module' : 'Lesson'}?`}
          message={pendingDelete.type === 'module'
            ? 'This will permanently delete the module and every lesson inside it. This cannot be undone.'
            : 'This will permanently delete the lesson and all of its content. This cannot be undone.'}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
