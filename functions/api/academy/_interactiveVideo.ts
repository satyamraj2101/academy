// Pure rules for interactive lesson videos: what a published video looks like, how watched time and quiz answers are
// validated, and when a student has genuinely completed it. No I/O, so it is unit-tested directly and shared by the admin
// publish endpoint and the student progress endpoint.

export interface VideoCheckpoint {
  sceneId: string;
  question: string;
  options: string[];
  answer: number;
  explanation?: string | null;
  pauseAt: number;
  revealAt: number;
}
export interface VideoChapter {
  index: number;
  id: string;
  title: string;
  station?: string | null;
  hint?: string | null;
  keyPoint?: string | null;
  start: number;
  end: number;
}
export interface VideoContent {
  v: 1;
  videoId: string;
  title: string;
  src: string;
  captionsSrc?: string | null;
  duration: number;
  stations: { id: string; name: string }[];
  chapters: VideoChapter[];
  checkpoints: VideoCheckpoint[];
}
export type Range = [number, number];
export type GradedAnswers = Record<string, { choice: number; correct: boolean }>;

export const MIN_WATCHED = 0.9; // fraction of the video that must actually have been played
export const MAX_RANGES = 200;
const MAX_DURATION = 4 * 3600;

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const str = (x: unknown, max: number) => (typeof x === 'string' ? x.slice(0, max) : '');
const safeSrc = (s: string) => !s.includes('..') && (/^\/api\/assets\/[\w./-]+$/.test(s) || /^https:\/\/[^\s"'<>]+$/.test(s));

// Turns whatever the Studio (or anyone with a service key) sends into a clean, bounded VideoContent, or explains why not.
export function buildVideoContent(input: any, videoId: string): { content?: VideoContent; error?: string } {
  if (!input || typeof input !== 'object') return { error: 'video payload is required' };
  const src = str(input.src, 500);
  if (!safeSrc(src)) return { error: 'src must be an /api/assets/ path or an https URL' };
  const captionsSrc = input.captionsSrc ? str(input.captionsSrc, 500) : null;
  if (captionsSrc && !safeSrc(captionsSrc)) return { error: 'captionsSrc must be an /api/assets/ path or an https URL' };
  const duration = Number(input.duration);
  if (!isNum(duration) || duration < 1 || duration > MAX_DURATION) return { error: 'duration must be between 1 second and 4 hours' };
  if (!Array.isArray(input.chapters) || input.chapters.length < 1 || input.chapters.length > 80) return { error: 'chapters must have 1 to 80 entries' };

  const chapters: VideoChapter[] = [];
  for (const [i, c] of input.chapters.entries()) {
    const start = Number(c?.start), end = Number(c?.end);
    if (!isNum(start) || !isNum(end) || start < 0 || end <= start || end > duration + 1) return { error: `chapter ${i + 1} has invalid times` };
    chapters.push({ index: i, id: str(c.id, 60) || `c${i + 1}`, title: str(c.title, 120) || `Part ${i + 1}`, station: c.station ? str(c.station, 40) : null, hint: c.hint ? str(c.hint, 200) : null, keyPoint: c.keyPoint ? str(c.keyPoint, 200) : null, start, end });
  }
  const checkpoints: VideoCheckpoint[] = [];
  for (const [i, q] of (Array.isArray(input.checkpoints) ? input.checkpoints : []).entries()) {
    const options = Array.isArray(q?.options) ? q.options.map((o: unknown) => str(o, 160)) : [];
    if (options.length < 2 || options.length > 6 || options.some((o: string) => !o)) return { error: `checkpoint ${i + 1} needs 2 to 6 options` };
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= options.length) return { error: `checkpoint ${i + 1} has an invalid answer index` };
    const pauseAt = Number(q.pauseAt), revealAt = Number(q.revealAt);
    if (!isNum(pauseAt) || !isNum(revealAt) || pauseAt < 0 || pauseAt > duration) return { error: `checkpoint ${i + 1} has invalid times` };
    checkpoints.push({ sceneId: str(q.sceneId, 60) || `q${i + 1}`, question: str(q.question, 300), options, answer: q.answer, explanation: q.explanation ? str(q.explanation, 300) : null, pauseAt, revealAt });
  }
  if (new Set(checkpoints.map(c => c.sceneId)).size !== checkpoints.length) return { error: 'checkpoint sceneIds must be unique' };
  const stations = (Array.isArray(input.stations) ? input.stations : []).slice(0, 20).map((s: any) => ({ id: str(s?.id, 40), name: str(s?.name, 60) })).filter((s: any) => s.id && s.name);
  return { content: { v: 1, videoId, title: str(input.title, 160) || 'Lesson video', src, captionsSrc, duration, stations, chapters, checkpoints } };
}

export function parseVideoContent(json: string): VideoContent | null {
  try {
    const c = JSON.parse(json);
    if (c && c.v === 1 && typeof c.videoId === 'string' && typeof c.src === 'string' && isNum(c.duration) && Array.isArray(c.chapters) && Array.isArray(c.checkpoints)) return c as VideoContent;
  } catch { /* fall through */ }
  return null;
}

// Clamp, sort and merge claimed [start,end] ranges (touching or overlapping ranges become one).
export function normaliseRanges(raw: unknown, duration: number): Range[] {
  if (!Array.isArray(raw)) return [];
  const rs: Range[] = [];
  for (const r of raw.slice(0, MAX_RANGES * 2)) {
    if (!Array.isArray(r) || r.length !== 2 || !isNum(r[0]) || !isNum(r[1])) continue;
    const a = Math.max(0, Math.min(duration, r[0])), b = Math.max(0, Math.min(duration, r[1]));
    if (b - a > 0.05) rs.push([a, b]);
  }
  rs.sort((x, y) => x[0] - y[0]);
  const out: Range[] = [];
  for (const r of rs) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1] + 0.5) last[1] = Math.max(last[1], r[1]); else out.push([r[0], r[1]]);
  }
  return out.slice(0, MAX_RANGES);
}
export const mergeRanges = (a: Range[], b: Range[], duration: number) => normaliseRanges([...a, ...b], duration);
export const watchedSeconds = (rs: Range[]) => rs.reduce((n, [a, b]) => n + (b - a), 0);

// A student cannot have watched more than real time allows (a little slack for 2x speed and clock drift).
export function plausibleWatched(claimedSeconds: number, sinceFirstSaveMs: number): boolean {
  return claimedSeconds <= (Math.max(0, sinceFirstSaveMs) / 1000) * 2.5 + 20;
}

// Grade on the server from the published content: the client only says which option was picked.
export function gradeAnswers(content: VideoContent, raw: unknown, prior: GradedAnswers = {}): GradedAnswers {
  const out: GradedAnswers = { ...prior };
  if (!raw || typeof raw !== 'object') return out;
  for (const cp of content.checkpoints) {
    if (out[cp.sceneId]) continue; // the first answer stands
    const choice = (raw as Record<string, unknown>)[cp.sceneId];
    if (Number.isInteger(choice) && (choice as number) >= 0 && (choice as number) < cp.options.length) out[cp.sceneId] = { choice: choice as number, correct: choice === cp.answer };
  }
  return out;
}

export function evaluate(content: VideoContent, ranges: Range[], answers: GradedAnswers) {
  const seconds = watchedSeconds(ranges), fraction = content.duration ? Math.min(1, seconds / content.duration) : 0;
  const answeredAll = content.checkpoints.every(cp => !!answers[cp.sceneId]);
  return { watchedSeconds: seconds, watchedFraction: fraction, answeredAll, completed: fraction >= MIN_WATCHED && answeredAll };
}
