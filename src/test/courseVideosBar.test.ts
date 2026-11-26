import { describe, it, expect } from 'vitest';
import { lessonsNeedingVideo, summarise } from '../admin/components/builder/CourseVideosBar';

const text = 'word '.repeat(60);
const lesson = (id: string, sections: { section_type: string; content: string }[]) => ({ id, title: id, sections });

describe('lessonsNeedingVideo', () => {
  it('lists lessons without a video that have enough text, and those with too little', () => {
    const r = lessonsNeedingVideo([{ lessons: [
      lesson('a', [{ section_type: 'markdown', content: text }]),
      lesson('b', [{ section_type: 'markdown', content: text }, { section_type: 'interactive_video', content: '{}' }]),
      lesson('c', [{ section_type: 'markdown', content: 'short' }]),
      lesson('d', []),
    ] }]);
    expect(r.ready.map(l => l.id)).toEqual(['a']);
    expect(r.noText.map(l => l.id)).toEqual(['c', 'd']);
  });
  it('adds up text across several blocks', () => {
    const half = 'word '.repeat(15);
    expect(lessonsNeedingVideo([{ lessons: [lesson('a', [{ section_type: 'markdown', content: half }, { section_type: 'markdown', content: half }])] }]).ready).toHaveLength(1);
  });
});

describe('summarise', () => {
  const since = Date.parse('2026-11-27T10:00:00Z');
  const row = (lesson_id: string, status: string, at: string) => ({ id: lesson_id + at, lesson_id, status, created_at: at });
  it('uses the latest job of each lesson and ignores older and other lessons', () => {
    const s = summarise([
      row('a', 'failed', '2026-11-27T10:01:00Z'), row('a', 'done', '2026-11-27T10:05:00Z'),
      row('b', 'running', '2026-11-27T10:02:00Z'),
      row('z', 'done', '2026-11-27T10:03:00Z'),
      row('c', 'done', '2026-11-26T09:00:00Z'),
    ], ['a', 'b', 'c'], since);
    expect(s).toMatchObject({ total: 3, done: 1, running: 1, failed: 0, queued: 1 });
  });
  it('counts lessons with no job yet as waiting', () => {
    expect(summarise([], ['a', 'b'], since).queued).toBe(2);
  });
});
