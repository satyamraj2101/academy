import { useEffect, useState } from 'react';
import { History, Loader2, X } from 'lucide-react';
import { adminFetch } from '../../hooks/useD1Query';
import { toast } from '../../../lib/toast';

interface Version { id: string; created_at: string; created_by: string | null; reason: string | null; summary: string | null }
interface Section { id?: string; section_type: string; content: string; sort_order?: number }

const stamp = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** "History" for a lesson: earlier versions of its blocks, a preview of each, and a Restore that can itself be undone. */
export function LessonHistory({ lessonId, onRestored }: { lessonId: string; onRestored: (sections: Section[]) => void }) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [picked, setPicked] = useState<{ id: string; sections: Section[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setVersions(null); setPicked(null);
    adminFetch(`/academy/lesson-versions?lessonId=${encodeURIComponent(lessonId)}`).then(v => setVersions(v as Version[])).catch(() => setVersions([]));
  }, [open, lessonId]);

  const preview = async (id: string) => {
    setBusy(id);
    try { const v = await adminFetch(`/academy/lesson-versions?id=${encodeURIComponent(id)}`) as { sections: Section[] }; setPicked({ id, sections: v.sections || [] }); }
    catch (e: any) { toast.error('Could not open that version', e.message); } finally { setBusy(null); }
  };
  const restore = async (id: string) => {
    setBusy(id);
    try {
      const res = await adminFetch('/academy/lesson-versions', { method: 'POST', body: JSON.stringify({ versionId: id }) }) as { sections: Section[] };
      onRestored(res.sections || []);
      toast.success('Version restored', 'The text you replaced is kept in the history.');
      setOpen(false);
    } catch (e: any) { toast.error('Could not restore', e.message); } finally { setBusy(null); }
  };

  const firstText = picked?.sections.find(s => s.section_type === 'markdown')?.content || '';

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="min-h-[40px] inline-flex items-center gap-1.5 px-3 text-sm font-medium text-slate-600 hover:text-slate-900">
        <History className="w-4 h-4" aria-hidden="true" /> History
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40" role="dialog" aria-modal="true" aria-label="Lesson history">
          <div className="bg-white sm:rounded-xl w-full h-full sm:h-auto sm:max-w-3xl sm:max-h-[80vh] flex flex-col overflow-hidden shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div><h3 className="font-medium text-slate-900">Lesson history</h3><p className="text-xs text-slate-500">Each save keeps what it replaced. The latest 20 are kept.</p></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2 text-slate-500 hover:text-slate-800"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-hidden grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
              <ul className="overflow-y-auto border-b sm:border-b-0 sm:border-r border-slate-200 divide-y divide-slate-100">
                {versions === null && <li className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></li>}
                {versions?.length === 0 && <li className="p-6 text-sm text-slate-500">No earlier versions yet. They appear after the first change is saved.</li>}
                {versions?.map(v => (
                  <li key={v.id}>
                    <button type="button" onClick={() => preview(v.id)} className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${picked?.id === v.id ? 'bg-slate-100' : ''}`}>
                      <p className="text-sm font-medium text-slate-900">{stamp(v.created_at)}{v.reason === 'restore' ? ' (before a restore)' : ''}</p>
                      <p className="text-xs text-slate-500">{v.created_by ? v.created_by.split('@')[0] : 'unknown'} · {v.summary}</p>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="overflow-y-auto p-4 min-h-[160px]">
                {!picked ? <p className="text-sm text-slate-500">Pick a version to see its text.</p> : (
                  <>
                    <pre className="whitespace-pre-wrap text-xs text-slate-700 font-mono leading-relaxed max-h-[44vh] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">{firstText.slice(0, 4000) || '(no text in this version)'}{firstText.length > 4000 ? '\n…' : ''}</pre>
                    <div className="mt-3 flex items-center gap-3">
                      <button type="button" onClick={() => restore(picked.id)} disabled={busy === picked.id} className="min-h-[40px] inline-flex items-center gap-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50">
                        {busy === picked.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Restore this version
                      </button>
                      <span className="text-xs text-slate-500">Replaces the lesson's current blocks.</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
