// What must be true before a course goes live, and what is only worth checking. Pure functions (no database), so the rules are tested.
// The endpoint in course-checklist.ts collects the facts; this decides.

export const MIN_LESSON_TEXT = 120;

export type ReviewState = 'none' | 'reviewed' | 'stale';

/** A review stands only while the lesson text has not been saved again after it. Videos do not count as lesson text. */
export function reviewState(reviewedAt: string | null | undefined, contentAt: string | null | undefined): ReviewState {
  if (!reviewedAt) return 'none';
  if (contentAt && contentAt > reviewedAt) return 'stale';
  return 'reviewed';
}

export interface LessonFacts { id: string; title: string; textChars: number; hasVideo: boolean; review: ReviewState }
export interface ModuleFacts { id: string; title: string; hasQuiz: boolean; lessons: LessonFacts[] }
export interface CourseFacts {
  title?: string | null; description?: string | null; thumbnailUrl?: string | null; bannerUrl?: string | null;
  hasCertification: boolean; priceUsd: number; priceInr: number; modules: ModuleFacts[];
}

export interface ChecklistItem { id: string; label: string; ok: boolean; required: boolean; detail: string; lessons: string[] }

const names = (ls: LessonFacts[]) => ls.slice(0, 6).map(l => l.title);
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

export function buildChecklist(c: CourseFacts): { items: ChecklistItem[]; canPublish: boolean } {
  const lessons = c.modules.flatMap(m => m.lessons);
  const noText = lessons.filter(l => l.textChars < MIN_LESSON_TEXT);
  const reviewed = lessons.filter(l => l.review === 'reviewed');
  const stale = lessons.filter(l => l.review === 'stale');
  const unreviewed = lessons.filter(l => l.review !== 'reviewed');
  const noVideo = lessons.filter(l => !l.hasVideo);
  const noQuiz = c.modules.filter(m => !m.hasQuiz);
  const free = !c.priceUsd && !c.priceInr;

  const items: ChecklistItem[] = [
    { id: 'basics', label: 'Title and description', required: true, ok: !!c.title?.trim() && !!c.description?.trim(), detail: c.title?.trim() && c.description?.trim() ? 'Both are written.' : 'Add a title and a short description on the Details tab.', lessons: [] },
    { id: 'lessons', label: 'The course has lessons', required: true, ok: lessons.length > 0, detail: lessons.length ? plural(lessons.length, 'lesson') + ` in ${plural(c.modules.length, 'module')}.` : 'Add a module and at least one lesson.', lessons: [] },
    { id: 'text', label: 'Every lesson has text', required: true, ok: lessons.length > 0 && noText.length === 0, detail: noText.length ? `${plural(noText.length, 'lesson')} with almost no text.` : 'All lessons have text.', lessons: names(noText) },
    { id: 'reviewed', label: 'Every lesson is reviewed', required: true, ok: lessons.length > 0 && unreviewed.length === 0,
      detail: lessons.length === 0 ? 'No lessons yet.' : `${reviewed.length} of ${lessons.length} reviewed${stale.length ? `, ${stale.length} changed since their review` : ''}.`, lessons: names(unreviewed) },
    { id: 'videos', label: 'Every lesson has a video', required: false, ok: lessons.length > 0 && noVideo.length === 0, detail: noVideo.length ? `${plural(noVideo.length, 'lesson')} without a video.` : 'All lessons have a video.', lessons: names(noVideo) },
    { id: 'quizzes', label: 'Every module has a quiz', required: false, ok: c.modules.length > 0 && noQuiz.length === 0, detail: noQuiz.length ? `${plural(noQuiz.length, 'module')} without a quiz.` : 'All modules have a quiz.', lessons: noQuiz.slice(0, 6).map(m => m.title) },
    { id: 'certificate', label: 'Certificate is switched on', required: false, ok: c.hasCertification, detail: c.hasCertification ? 'Students get a certificate when they finish.' : 'Students will not get a certificate. Turn it on in Settings.', lessons: [] },
    { id: 'picture', label: 'Course picture', required: false, ok: !!(c.thumbnailUrl || c.bannerUrl), detail: c.thumbnailUrl || c.bannerUrl ? 'A picture is set.' : 'No picture; the catalog shows a drawn placeholder.', lessons: [] },
    { id: 'price', label: 'Price', required: false, ok: true, detail: free ? 'Free course.' : 'Paid course.', lessons: [] },
  ];
  return { items, canPublish: items.filter(i => i.required).every(i => i.ok) };
}
