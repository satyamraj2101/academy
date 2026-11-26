import { describe, it, expect } from 'vitest';
import { buildVideoContent, normaliseRanges, mergeRanges, watchedSeconds, plausibleWatched, gradeAnswers, evaluate, parseVideoContent, MIN_WATCHED } from '../../functions/api/academy/_interactiveVideo';

const input = (over: Record<string, unknown> = {}) => ({
  src: '/api/assets/abc.mp4', title: 'What is CLM?', duration: 100, stations: [{ id: 'frontdesk', name: 'Front desk' }],
  chapters: [{ id: 'a', title: 'A', start: 0, end: 50, station: 'frontdesk' }, { id: 'b', title: 'B', start: 52, end: 100 }],
  checkpoints: [{ sceneId: 'check', question: 'Q?', options: ['x', 'y', 'z'], answer: 1, pauseAt: 60, revealAt: 70 }],
  ...over,
});
const build = (over?: Record<string, unknown>) => buildVideoContent(input(over), 'vid-1');

describe('buildVideoContent', () => {
  it('accepts a good payload and stamps the video id', () => {
    const { content, error } = build();
    expect(error).toBeUndefined();
    expect(content?.videoId).toBe('vid-1');
    expect(content?.chapters).toHaveLength(2);
    expect(parseVideoContent(JSON.stringify(content))?.title).toBe('What is CLM?');
  });
  it('only allows our asset path or https for the video source', () => {
    for (const src of ['javascript:alert(1)', 'http://insecure.example/v.mp4', '//evil.example/v.mp4', '/etc/passwd', '/api/assets/../secret', 'https://x.example/../a']) {
      expect(build({ src }).error, src).toMatch(/src must be/);
    }
    expect(build({ src: 'https://cdn.example/v.mp4' }).error).toBeUndefined();
  });
  it('rejects bad durations, chapters and checkpoints', () => {
    expect(build({ duration: 0 }).error).toMatch(/duration/);
    expect(build({ chapters: [] }).error).toMatch(/chapters/);
    expect(build({ chapters: [{ start: 10, end: 5 }] }).error).toMatch(/invalid times/);
    expect(build({ checkpoints: [{ sceneId: 'q', question: 'Q', options: ['only'], answer: 0, pauseAt: 1, revealAt: 2 }] }).error).toMatch(/options/);
    expect(build({ checkpoints: [{ sceneId: 'q', question: 'Q', options: ['a', 'b'], answer: 5, pauseAt: 1, revealAt: 2 }] }).error).toMatch(/answer index/);
    const cp = { sceneId: 'q', question: 'Q', options: ['a', 'b'], answer: 0, pauseAt: 1, revealAt: 2 };
    expect(build({ checkpoints: [cp, cp] }).error).toMatch(/unique/);
  });
  it('keeps the saved script address only when it is a safe source', () => {
    expect(build({ scriptSrc: '/api/assets/s.json' }).content?.scriptSrc).toBe('/api/assets/s.json');
    expect(build().content).not.toHaveProperty('scriptSrc');
    expect(build({ scriptSrc: 'javascript:alert(1)' }).error).toMatch(/scriptSrc must be/);
    expect(build({ scriptSrc: '/api/assets/../x.json' }).error).toMatch(/scriptSrc must be/);
  });
  it('bounds text lengths', () => {
    const { content } = build({ title: 'x'.repeat(1000) });
    expect(content?.title.length).toBe(160);
  });
});

describe('watched ranges', () => {
  it('merges overlapping and touching ranges and clamps to the video', () => {
    expect(normaliseRanges([[10, 20], [15, 30], [30.2, 40], [90, 150]], 100)).toEqual([[10, 40], [90, 100]]);
  });
  it('ignores junk', () => {
    expect(normaliseRanges('nope', 100)).toEqual([]);
    expect(normaliseRanges([[1], ['a', 2], [NaN, 3], [5, 5.01], [-5, 2]], 100)).toEqual([[0, 2]]);
  });
  it('adds up and merges with earlier progress', () => {
    const a = normaliseRanges([[0, 30]], 100), b = normaliseRanges([[20, 50]], 100);
    expect(watchedSeconds(mergeRanges(a, b, 100))).toBe(50);
  });
  it('cannot claim more than real time allows', () => {
    expect(plausibleWatched(15, 0)).toBe(true); // a first save can cover a few seconds
    expect(plausibleWatched(100, 0)).toBe(false); // but not a whole video in zero time
    expect(plausibleWatched(100, 60_000)).toBe(true); // 100 s of video in 60 s of wall time is within 2.5x + slack
    expect(plausibleWatched(600, 60_000)).toBe(false);
  });
});

describe('grading and completion', () => {
  const content = build().content!;
  it('grades on the server and keeps the first answer', () => {
    const first = gradeAnswers(content, { check: 1 });
    expect(first.check).toEqual({ choice: 1, correct: true });
    const retry = gradeAnswers(content, { check: 0 }, first);
    expect(retry.check).toEqual({ choice: 1, correct: true });
  });
  it('ignores unknown questions and out-of-range choices', () => {
    expect(gradeAnswers(content, { nope: 1 })).toEqual({});
    expect(gradeAnswers(content, { check: 9 })).toEqual({});
    expect(gradeAnswers(content, { check: '1' })).toEqual({});
    expect(gradeAnswers(content, null)).toEqual({});
  });
  it('a wrong answer still counts as answered, and is marked wrong', () => {
    expect(gradeAnswers(content, { check: 0 }).check).toEqual({ choice: 0, correct: false });
  });
  it('is complete only when enough was watched AND every question was answered', () => {
    const answered = gradeAnswers(content, { check: 2 });
    expect(evaluate(content, [[0, 95]], answered).completed).toBe(true);
    expect(evaluate(content, [[0, 95]], {}).completed).toBe(false);
    expect(evaluate(content, [[0, 40]], answered).completed).toBe(false);
    expect(evaluate(content, [[0, 100 * MIN_WATCHED]], answered).completed).toBe(true);
  });
  it('a video with no questions completes on watching alone', () => {
    const plain = buildVideoContent(input({ checkpoints: [] }), 'v2').content!;
    expect(evaluate(plain, [[0, 91]], {}).completed).toBe(true);
  });
});
