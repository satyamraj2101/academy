import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { adminFetch } from '../../hooks/useD1Query';
import { toast } from '../../../lib/toast';

export type ReviewState = 'none' | 'reviewed' | 'stale';
export interface Review { lesson_id: string; state: ReviewState; reviewed_by: string | null; reviewed_at: string | null; note: string | null }

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const who = (email: string | null) => (email ? email.split('@')[0] : 'someone');

/** A small mark on a lesson row: reviewed, or changed since its review. Nothing for a lesson nobody has reviewed. */
export function ReviewBadge({ review }: { review?: Review }) {
  if (!review || review.state === 'none') return null;
  const stale = review.state === 'stale';
  return (
    <span
      title={stale ? `Reviewed by ${who(review.reviewed_by)} on ${when(review.reviewed_at)}, then the text changed` : `Reviewed by ${who(review.reviewed_by)} on ${when(review.reviewed_at)}`}
      className={`hidden sm:flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 border ${stale ? 'text-amber-700 border-amber-200' : 'text-emerald-700 border-emerald-200'}`}
    >
      <Check className="w-3 h-3" aria-hidden="true" /> {stale ? 'Changed since review' : 'Reviewed'}
    </span>
  );
}

/** In the lesson editor: mark the lesson as checked by you, or take the mark back. */
export function LessonReviewControl({ lessonId, review, onChange }: { lessonId: string; review?: Review; onChange: (r: Review) => void }) {
  const [busy, setBusy] = useState(false);
  const state: ReviewState = review?.state ?? 'none';
  const set = async (reviewed: boolean) => {
    setBusy(true);
    try {
      const res = await adminFetch('/academy/lesson-reviews', { method: 'POST', body: JSON.stringify({ lessonId, reviewed }) }) as { state: ReviewState; reviewed_by?: string; reviewed_at?: string };
      onChange({ lesson_id: lessonId, state: res.state, reviewed_by: res.reviewed_by ?? null, reviewed_at: res.reviewed_at ?? null, note: null });
      toast.success(reviewed ? 'Marked as reviewed' : 'Review removed');
    } catch (e: any) {
      toast.error('Could not update the review', e.message || 'Try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      {state === 'reviewed' && <span className="flex items-center gap-1.5 text-emerald-700"><Check className="w-4 h-4" aria-hidden="true" /> Reviewed by {who(review!.reviewed_by)} on {when(review!.reviewed_at)}</span>}
      {state === 'stale' && <span className="text-amber-700">Changed since {who(review!.reviewed_by)} reviewed it on {when(review!.reviewed_at)}</span>}
      {state === 'none' && <span className="text-slate-500">Not reviewed yet</span>}
      {state === 'reviewed' ? (
        <button type="button" onClick={() => set(false)} disabled={busy} className="min-h-[36px] underline text-slate-600 hover:text-slate-900 disabled:opacity-50">Remove</button>
      ) : (
        <button type="button" onClick={() => set(true)} disabled={busy} className="min-h-[36px] inline-flex items-center gap-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-medium disabled:opacity-50">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Check className="w-3.5 h-3.5" aria-hidden="true" />} {state === 'stale' ? 'Review again' : 'Mark as reviewed'}
        </button>
      )}
    </div>
  );
}
