import { describe, it, expect } from 'vitest';
import { buildChecklist, reviewState, MIN_LESSON_TEXT, type CourseFacts, type LessonFacts } from '../../functions/api/admin/academy/_courseChecklist';

const lesson = (id: string, over: Partial<LessonFacts> = {}): LessonFacts => ({ id, title: `Lesson ${id}`, textChars: 900, hasVideo: true, review: 'reviewed', ...over });
const course = (over: Partial<CourseFacts> = {}): CourseFacts => ({
  title: 'CLM', description: 'About CLM', thumbnailUrl: '/img.png', bannerUrl: null, hasCertification: true, priceUsd: 0, priceInr: 0,
  modules: [{ id: 'm1', title: 'Module 1', hasQuiz: true, lessons: [lesson('a'), lesson('b')] }], ...over,
});
const item = (c: CourseFacts, id: string) => buildChecklist(c).items.find(i => i.id === id)!;

describe('reviewState', () => {
  it('is none without a review, reviewed while the text is unchanged, stale after it changes', () => {
    expect(reviewState(null, '2026-11-27T10:00:00Z')).toBe('none');
    expect(reviewState('2026-11-27T10:00:00Z', '2026-11-27T09:00:00Z')).toBe('reviewed');
    expect(reviewState('2026-11-27T10:00:00Z', '2026-11-27T10:00:00Z')).toBe('reviewed');
    expect(reviewState('2026-11-27T10:00:00Z', '2026-11-27T11:00:00Z')).toBe('stale');
    expect(reviewState('2026-11-27T10:00:00Z', null)).toBe('reviewed');
  });
});

describe('buildChecklist', () => {
  it('lets a complete, reviewed course publish', () => {
    const r = buildChecklist(course());
    expect(r.canPublish).toBe(true);
    expect(r.items.every(i => i.ok)).toBe(true);
  });
  it('blocks when a lesson is not reviewed, and names it', () => {
    const c = course({ modules: [{ id: 'm', title: 'M', hasQuiz: true, lessons: [lesson('a'), lesson('b', { review: 'none' })] }] });
    expect(buildChecklist(c).canPublish).toBe(false);
    expect(item(c, 'reviewed')).toMatchObject({ ok: false, required: true, lessons: ['Lesson b'], detail: '1 of 2 reviewed.' });
  });
  it('counts a lesson changed after its review as not reviewed', () => {
    const c = course({ modules: [{ id: 'm', title: 'M', hasQuiz: true, lessons: [lesson('a', { review: 'stale' })] }] });
    expect(item(c, 'reviewed').detail).toBe('0 of 1 reviewed, 1 changed since their review.');
    expect(buildChecklist(c).canPublish).toBe(false);
  });
  it('blocks a course with no lessons or with an empty lesson', () => {
    expect(buildChecklist(course({ modules: [] })).canPublish).toBe(false);
    const thin = course({ modules: [{ id: 'm', title: 'M', hasQuiz: true, lessons: [lesson('a', { textChars: MIN_LESSON_TEXT - 1 })] }] });
    expect(item(thin, 'text').ok).toBe(false);
    expect(buildChecklist(thin).canPublish).toBe(false);
  });
  it('blocks without a title or description', () => {
    expect(buildChecklist(course({ description: '  ' })).canPublish).toBe(false);
  });
  it('only advises about videos, quizzes, the certificate and the picture', () => {
    const c = course({ hasCertification: false, thumbnailUrl: null, modules: [{ id: 'm', title: 'M', hasQuiz: false, lessons: [lesson('a', { hasVideo: false })] }] });
    const r = buildChecklist(c);
    expect(r.canPublish).toBe(true);
    for (const id of ['videos', 'quizzes', 'certificate', 'picture']) expect(item(c, id)).toMatchObject({ ok: false, required: false });
    expect(item(c, 'quizzes').lessons).toEqual(['M']);
  });
  it('describes the price', () => {
    expect(item(course(), 'price').detail).toBe('Free course.');
    expect(item(course({ priceInr: 49900 }), 'price').detail).toBe('Paid course.');
  });
});
