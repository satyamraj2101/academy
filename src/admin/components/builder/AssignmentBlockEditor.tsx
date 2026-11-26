import { useState, useEffect } from 'react';
import { Loader2, Save, Library, X } from 'lucide-react';
import { adminFetch } from '../../hooks/useD1Query';
import { toast } from '../../../lib/toast';
import { AiTextChange } from './AiTextChange';

interface AssignmentBlockEditorProps {
  lessonId: string;
  value: string; // JSON: { assignmentId?: string }
  onChange: (val: string) => void;
}

interface AssignmentTemplate {
  id: string;
  title: string;
  prompt_text: string;
  submission_type: 'text' | 'file' | 'both';
  max_score: number;
}

export function AssignmentBlockEditor({ lessonId, value, onChange }: AssignmentBlockEditorProps) {
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [promptText, setPromptText] = useState('');
  const [submissionType, setSubmissionType] = useState<'text' | 'file' | 'both'>('text');
  const [maxScore, setMaxScore] = useState(100);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<AssignmentTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    fetchAssignment();
  }, []);

  const fetchAssignment = async () => {
    setLoading(true);
    try {
      const data = await adminFetch(`/academy/assignments?lessonId=${lessonId}`) as { assignments: Array<{ id: string; prompt_text: string; submission_type: 'text' | 'file' | 'both'; max_score: number }> };
      const existing = data.assignments?.[0];
      if (existing) {
        setAssignmentId(existing.id);
        setPromptText(existing.prompt_text);
        setSubmissionType(existing.submission_type);
        setMaxScore(existing.max_score);
        // Block content may not yet reference this assignment — e.g. it was
        // pre-created elsewhere (AI Studio) before this block was added.
        if (!value || value === '{}') {
          onChange(JSON.stringify({ assignmentId: existing.id }));
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!promptText.trim()) {
      toast.error('Enter the assignment prompt');
      return;
    }
    setSaving(true);
    try {
      if (assignmentId) {
        await adminFetch('/academy/assignments', {
          method: 'PUT',
          body: JSON.stringify({ id: assignmentId, prompt_text: promptText, submission_type: submissionType, max_score: maxScore })
        });
      } else {
        const res = await adminFetch('/academy/assignments', {
          method: 'POST',
          body: JSON.stringify({ lesson_id: lessonId, prompt_text: promptText, submission_type: submissionType, max_score: maxScore })
        }) as { id: string };
        setAssignmentId(res.id);
        onChange(JSON.stringify({ assignmentId: res.id }));
      }
      toast.success('Assignment saved');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save assignment');
    } finally {
      setSaving(false);
    }
  };

  const openTemplates = async () => {
    setShowTemplates(true);
    setLoadingTemplates(true);
    try {
      const data = await adminFetch('/academy/assignment-templates') as { success: boolean; templates: AssignmentTemplate[] };
      setTemplates(data.templates || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const applyTemplate = (t: AssignmentTemplate) => {
    setPromptText(t.prompt_text);
    setSubmissionType(t.submission_type);
    setMaxScore(t.max_score);
    setShowTemplates(false);
    toast.success('Template applied — click Save to confirm');
  };

  if (loading) return <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-slate-500">Assignment Prompt</label>
          <button onClick={openTemplates} className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900">
            <Library className="w-3.5 h-3.5" /> Use Template
          </button>
        </div>
        <textarea
          value={promptText}
          onChange={e => setPromptText(e.target.value)}
          rows={4}
          placeholder="Describe what students need to submit for this assignment..."
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
        />
      </div>
      <AiTextChange what="assignment" label="Ask AI to change this assignment" value={promptText} onApply={setPromptText} placeholder="For example: make it about a supplier contract, ask for a one-page summary, make the task easier" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">Submission Type</label>
          <select
            value={submissionType}
            onChange={e => setSubmissionType(e.target.value as any)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
          >
            <option value="text">Text Response</option>
            <option value="file">File Upload</option>
            <option value="both">Text + File</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">Max Score</label>
          <input
            type="number"
            value={maxScore}
            onChange={e => setMaxScore(Number(e.target.value))}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm shadow-sm transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {assignmentId ? 'Update Assignment' : 'Create Assignment'}
        </button>
      </div>

      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white sm:rounded-xl w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[80vh] flex flex-col overflow-hidden shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-medium text-slate-800">Choose an Assignment Template</h3>
              <button onClick={() => setShowTemplates(false)} className="p-2 -mr-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingTemplates ? (
                <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
              ) : templates.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-8">No assignment templates in your library yet. Build one from Courses → Library.</p>
              ) : (
                templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className="w-full text-left p-3 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
                  >
                    <p className="font-medium text-sm text-slate-800">{t.title}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.prompt_text}</p>
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
