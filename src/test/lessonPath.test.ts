import { describe, it, expect } from 'vitest';
import { buildPath, doneCount, activeStepAt, type PathInput } from '../lib/lessonPath';
import { SPEEDS, formatSpeed, clamp, pct, skipTo, timeAtPointer } from '../lib/interactiveVideo';
import { normalizeMermaid, naturalSize } from '../components/mermaidSource';

const all: PathInput = { hasWatch: true, watchDone: false, hasRead: true, readViewed: false, hasCheck: true, checkDone: false };

describe('lesson path', () => {
  it('shows Watch, Read and Check in order, with the first open step current', () => {
    const steps = buildPath(all, null);
    expect(steps.map(s => s.id)).toEqual(['watch', 'read', 'check']);
    expect(steps.map(s => s.state)).toEqual(['current', 'todo', 'todo']);
  });

  it('marks finished steps done and moves current to the next open one', () => {
    const steps = buildPath({ ...all, watchDone: true }, null);
    expect(steps.map(s => s.state)).toEqual(['done', 'current', 'todo']);
    expect(doneCount(steps)).toBe(1);
  });

  it('follows where the student has scrolled, unless that step is already done', () => {
    expect(buildPath(all, 'check').map(s => s.state)).toEqual(['todo', 'todo', 'current']);
    expect(buildPath({ ...all, checkDone: true }, 'check').map(s => s.state)).toEqual(['current', 'todo', 'done']);
  });

  it('leaves out parts the lesson does not have', () => {
    expect(buildPath({ ...all, hasRead: false }, null).map(s => s.id)).toEqual(['watch', 'check']);
  });

  it('shows nothing for a lesson with a single part', () => {
    expect(buildPath({ hasWatch: false, watchDone: false, hasRead: true, readViewed: false, hasCheck: false, checkDone: false }, null)).toEqual([]);
    expect(buildPath({ hasWatch: true, watchDone: false, hasRead: false, readViewed: false, hasCheck: false, checkDone: false }, null)).toEqual([]);
  });

  it('has no current step once everything is done', () => {
    const steps = buildPath({ hasWatch: true, watchDone: true, hasRead: true, readViewed: true, hasCheck: true, checkDone: true }, 'read');
    expect(steps.every(s => s.state === 'done')).toBe(true);
  });

  it('picks the step by scroll position', () => {
    const tops = { watch: -300, read: 40, check: 900 };
    expect(activeStepAt(tops, 120, false)).toBe('read');
    expect(activeStepAt({ watch: 20, read: 700, check: 1500 }, 120, false)).toBe('watch');
    expect(activeStepAt(tops, 120, true)).toBe('check'); // bottom of the page: the last step wins
    expect(activeStepAt({}, 120, false)).toBeNull();
  });
});

describe('player controls', () => {
  it('offers the usual speeds, with a clean label', () => {
    expect(SPEEDS).toContain(1);
    expect(formatSpeed(1.25)).toBe('1.25×');
  });
  it('clamps and converts positions', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(pct(65, 130)).toBe(50);
    expect(pct(10, 0)).toBe(0);
    expect(pct(500, 130)).toBe(100);
  });
  it('never skips outside the video', () => {
    expect(skipTo(3, -10, 130)).toBe(0);
    expect(skipTo(125, 10, 130)).toBe(130);
    expect(skipTo(50, 5, 130)).toBe(55);
  });
  it('turns a pointer position into a time on the scrubber', () => {
    expect(timeAtPointer(150, 100, 200, 130)).toBeCloseTo(32.5);
    expect(timeAtPointer(0, 100, 200, 130)).toBe(0);
    expect(timeAtPointer(999, 100, 200, 130)).toBe(130);
    expect(timeAtPointer(150, 100, 0, 130)).toBe(0);
  });
});

describe('diagram size', () => {
  it('gives the SVG its drawn width and drops the fluid sizing', () => {
    const out = naturalSize('<svg id="a" width="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 703.5 120" style="max-width: 703.5px;" role="graphics-document"><g/></svg>');
    expect(out).toContain('width="704"');
    expect(out).not.toContain('100%');
    expect(out).not.toContain('max-width');
    expect(out).toContain('viewBox="0 0 703.5 120"');
  });
  it('leaves an SVG without a viewBox alone', () => {
    const src = '<svg width="100%"><g/></svg>';
    expect(naturalSize(src)).toBe(src);
  });
});

describe('diagram source', () => {
  it('turns stored literal \\n into real line breaks for a one-line source', () => {
    expect(normalizeMermaid('graph LR\\n  A[Generation] --> B[Negotiation]\\n  B --> C[Approval]')).toBe('graph LR\n  A[Generation] --> B[Negotiation]\n  B --> C[Approval]');
  });
  it('leaves a source that already has line breaks alone', () => {
    const src = 'graph LR\n  A["Line one\\nline two"] --> B';
    expect(normalizeMermaid(src)).toBe(src);
  });
});
