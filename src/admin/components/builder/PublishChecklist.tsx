import { useEffect, useState } from 'react';
import { Check, Circle, Loader2, X } from 'lucide-react';
import { adminFetch } from '../../hooks/useD1Query';

interface Item { id: string; label: string; ok: boolean; required: boolean; detail: string; lessons: string[] }
interface Checklist { items: Item[]; canPublish: boolean }

/** Shown when someone clicks Publish: what is ready, what is not, and which open items stop the course going live. */
export function PublishChecklist({ courseId, onClose, onPublish }: { courseId: string; onClose: () => void; onPublish: (unmetIds: string[]) => void }) {
  const [data, setData] = useState<Checklist | null>(null);
  const [error, setError] = useState('');
  const [sure, setSure] = useState(false);

  useEffect(() => {
    let alive = true;
    adminFetch(`/academy/course-checklist?courseId=${encodeURIComponent(courseId)}`).then(d => { if (alive) setData(d as Checklist); }).catch(e => { if (alive) setError(e.message || 'Could not check the course.'); });
    return () => { alive = false; };
  }, [courseId]);

  const open = data?.items.filter(i => !i.ok) ?? [];
  const blocked = !!data && !data.canPublish;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40" role="dialog" aria-modal="true" aria-labelledby="publish-title">
      <div className="bg-white sm:rounded-xl w-full sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-lg">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 id="publish-title" className="font-medium text-slate-900">Before you publish</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 text-slate-500 hover:text-slate-800"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!data && !error && <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>}
          {error && <p className="text-sm text-rose-700">{error}</p>}
          {data && (
            <ul className="divide-y divide-slate-100">
              {data.items.map(i => (
                <li key={i.id} className="py-3 flex gap-3">
                  {i.ok ? <Check className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" aria-label="Done" /> : <Circle className={`w-4 h-4 mt-0.5 shrink-0 ${i.required ? 'text-rose-500' : 'text-slate-400'}`} aria-label="Open" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{i.label}{!i.ok && i.required ? <span className="ml-2 text-xs font-normal text-rose-700">Required</span> : null}</p>
                    <p className="text-xs text-slate-600">{i.detail}</p>
                    {!i.ok && i.lessons.length > 0 && <p className="mt-1 text-xs text-slate-500">{i.lessons.join(', ')}{i.lessons.length >= 6 ? ' and more' : ''}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {blocked && (
            <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={sure} onChange={e => setSure(e.target.checked)} className="mt-1" />
              <span>I understand students will see this course with the required items still open.</span>
            </label>
          )}
        </div>
        <div className="px-5 py-4 border-t border-slate-200 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-[40px] px-4 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
          <button
            type="button"
            disabled={!data || (blocked && !sure)}
            onClick={() => onPublish(open.map(i => i.id))}
            className="min-h-[40px] px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {blocked ? 'Publish anyway' : open.length ? 'Publish' : 'Publish course'}
          </button>
        </div>
      </div>
    </div>
  );
}
