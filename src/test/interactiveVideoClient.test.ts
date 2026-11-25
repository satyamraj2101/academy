import { describe, it, expect } from 'vitest';
import { parseContent, stopsOf, stopIndexAt, chapterAt, hintFor, mergeRanges, WatchTracker, formatTime, type IVContent } from '../lib/interactiveVideo';

const content: IVContent = {
  v: 1, videoId: 'v', title: 'T', src: '/api/assets/x.mp4', duration: 100,
  stations: [{ id: 'front', name: 'Front desk' }, { id: 'rev', name: 'Review table' }],
  chapters: [
    { index: 0, id: 'a', title: 'Intro', station: 'front', start: 0, end: 20, hint: 'say hi' },
    { index: 1, id: 'b', title: 'Hook', station: 'front', start: 20.5, end: 40, keyPoint: 'key' },
    { index: 2, id: 'c', title: 'Why', station: 'rev', start: 43, end: 70 },
    { index: 3, id: 'd', title: 'Recap', station: 'front', start: 73, end: 100 },
  ],
  checkpoints: [],
};

describe('route', () => {
  it('merges consecutive scenes at one station and treats a revisit as a new stop', () => {
    const stops = stopsOf(content);
    expect(stops.map(s => s.name)).toEqual(['Front desk', 'Review table', 'Front desk']);
    expect(stops[0]).toMatchObject({ start: 0, end: 40, chapterIds: ['a', 'b'] });
  });
  it('a ship ride belongs to the stop it is leaving', () => {
    const stops = stopsOf(content);
    expect(stopIndexAt(stops, 41)).toBe(0);
    expect(stopIndexAt(stops, 43)).toBe(1);
    expect(stopIndexAt(stops, 72)).toBe(1);
    expect(stopIndexAt(stops, 90)).toBe(2);
  });
  it('finds the chapter for a time, including times during a ride', () => {
    expect(chapterAt(content.chapters, 41)?.id).toBe('b');
    expect(chapterAt(content.chapters, 999)?.id).toBe('d');
    expect(chapterAt(content.chapters, 0)?.id).toBe('a');
  });
});

describe('hints and parsing', () => {
  it('prefers the hint, then the key point, then a friendly fallback', () => {
    expect(hintFor(content.chapters[0])).toBe('say hi');
    expect(hintFor(content.chapters[1])).toBe('key');
    expect(hintFor(content.chapters[2])).toMatch(/Nothing to add/);
    expect(hintFor(undefined)).toMatch(/Nothing to add/);
  });
  it('only accepts published interactive videos', () => {
    expect(parseContent(JSON.stringify(content))?.videoId).toBe('v');
    expect(parseContent('{"src":"x"}')).toBeNull();
    expect(parseContent('not json')).toBeNull();
  });
  it('formats times', () => expect(formatTime(125.9)).toBe('2:05'));
});

describe('WatchTracker', () => {
  const play = (tr: WatchTracker, from: number, to: number) => { for (let t = from; t <= to; t += 0.25) tr.tick(t, true); };
  it('counts played time only', () => {
    const tr = new WatchTracker();
    play(tr, 0, 10);
    tr.tick(10, false);
    expect(tr.seconds()).toBeCloseTo(10, 0);
  });
  it('a seek forward does not count as watching the skipped part', () => {
    const tr = new WatchTracker();
    play(tr, 0, 5);
    play(tr, 60, 65); // jumped ahead
    expect(tr.seconds()).toBeCloseTo(10, 0);
    expect(tr.snapshot()).toHaveLength(2);
  });
  it('re-watching earlier material does not double count', () => {
    const tr = new WatchTracker();
    play(tr, 0, 10);
    play(tr, 2, 8); // went back and replayed
    expect(tr.seconds()).toBeCloseTo(10, 0);
  });
  it('keeps what was watched in an earlier session', () => {
    const tr = new WatchTracker([[0, 30]]);
    play(tr, 30, 40);
    expect(tr.seconds()).toBeCloseTo(40, 0);
  });
  it('merges touching ranges', () => expect(mergeRanges([[0, 10], [10.2, 20], [50, 60]])).toEqual([[0, 20], [50, 60]]));
});
