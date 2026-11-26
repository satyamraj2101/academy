import { describe, it, expect } from 'vitest';
import { describeSnapshot, sameSnapshot, snapshotJson, toSnapshot, MAX_SNAPSHOT_CHARS } from '../../functions/api/admin/academy/_lessonVersions';

const rows = [
  { section_type: 'quiz', content: '{"quizId":"q"}', is_mandatory: 1, sort_order: 3 },
  { section_type: 'markdown', content: 'Hello world', is_mandatory: 1, sort_order: 1 },
  { section_type: 'interactive_video', content: '{}', is_mandatory: 1, sort_order: 2 },
];

describe('toSnapshot', () => {
  it('orders blocks by their position and keeps only what a version needs', () => {
    expect(toSnapshot(rows).map(s => s.section_type)).toEqual(['markdown', 'interactive_video', 'quiz']);
    expect(Object.keys(toSnapshot(rows)[0]).sort()).toEqual(['content', 'is_mandatory', 'section_type']);
  });
});

describe('sameSnapshot', () => {
  it('is true for the same blocks, whatever the extra fields, and false for any change', () => {
    const a = toSnapshot(rows);
    expect(sameSnapshot(a, [...a])).toBe(true);
    expect(sameSnapshot(a, a.map(s => ({ ...s, id: 'x', sort_order: 9 })))).toBe(true);
    expect(sameSnapshot(a, a.slice(1))).toBe(false);
    expect(sameSnapshot(a, a.map((s, i) => (i === 0 ? { ...s, content: 'Hello there' } : s)))).toBe(false);
    expect(sameSnapshot(a, a.map((s, i) => (i === 0 ? { ...s, is_mandatory: 0 } : s)))).toBe(false);
  });
  it('treats a missing mandatory flag as off', () => {
    expect(sameSnapshot([{ section_type: 'markdown', content: 'x' }], [{ section_type: 'markdown', content: 'x', is_mandatory: false }])).toBe(true);
  });
});

describe('describeSnapshot', () => {
  it('summarises blocks, text and the kinds present', () => {
    expect(describeSnapshot(toSnapshot(rows))).toBe('3 blocks, 11 characters of text, video, quiz');
    expect(describeSnapshot([{ section_type: 'markdown', content: 'x'.repeat(2140), is_mandatory: 1 }])).toBe('1 block, 2,140 characters of text');
  });
});

describe('snapshotJson', () => {
  it('returns the json, or null when it would be too large to keep', () => {
    expect(snapshotJson(toSnapshot(rows))).toContain('Hello world');
    expect(snapshotJson([{ section_type: 'markdown', content: 'x'.repeat(MAX_SNAPSHOT_CHARS + 10), is_mandatory: 1 }])).toBeNull();
  });
});
