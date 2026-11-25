// Helpers for the interactive lesson video player: the published content shape, the campus route, and an honest watch
// tracker. Pure functions, so they are unit-tested without a browser.

export type Range = [number, number];
export interface IVChapter { index: number; id: string; title: string; station?: string | null; hint?: string | null; keyPoint?: string | null; start: number; end: number }
export interface IVCheckpoint { sceneId: string; question: string; options: string[]; answer: number; explanation?: string | null; pauseAt: number; revealAt: number }
export interface IVContent {
  v: 1; videoId: string; title: string; src: string; captionsSrc?: string | null; duration: number;
  stations: { id: string; name: string }[]; chapters: IVChapter[]; checkpoints: IVCheckpoint[];
}
export interface IVAnswer { choice: number; correct: boolean }
export interface IVProgress {
  videoId: string; position: number; watched: Range[]; answers: Record<string, IVAnswer>;
  watchedSeconds: number; watchedFraction: number; answeredAll: boolean; completed: boolean; mandatory?: boolean;
}

export function parseContent(json: string): IVContent | null {
  try {
    const c = JSON.parse(json);
    if (c && c.v === 1 && typeof c.src === 'string' && typeof c.videoId === 'string' && Array.isArray(c.chapters) && c.chapters.length && Array.isArray(c.checkpoints) && typeof c.duration === 'number') return c as IVContent;
  } catch { /* not a published interactive video */ }
  return null;
}

// ---- Player controls (pure helpers for the custom control bar) ----
export const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
export const formatSpeed = (r: number) => `${r}×`;
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
/** Position of a time on the scrubber, as a percentage 0..100. */
export const pct = (t: number, duration: number) => (duration > 0 ? clamp((t / duration) * 100, 0, 100) : 0);
/** Where a skip lands: never before the start, never past the end. */
export const skipTo = (t: number, delta: number, duration: number) => clamp(t + delta, 0, Math.max(0, duration));
/** A pointer position over the scrubber, turned into a time. */
export const timeAtPointer = (clientX: number, left: number, width: number, duration: number) => (width > 0 ? clamp((clientX - left) / width, 0, 1) * duration : 0);

export const formatTime = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

// The route shown as a map: consecutive scenes at the same station are one stop, and a station revisited later is a new stop.
export interface Stop { name: string; station: string | null; start: number; end: number; chapterIds: string[] }
export function stopsOf(content: Pick<IVContent, 'chapters' | 'stations'>): Stop[] {
  const names = new Map(content.stations.map(s => [s.id, s.name]));
  const out: Stop[] = [];
  for (const c of content.chapters) {
    const last = out[out.length - 1];
    if (last && c.station && last.station === c.station) { last.end = c.end; last.chapterIds.push(c.id); continue; }
    out.push({ name: c.station ? names.get(c.station) || c.station : c.title, station: c.station || null, start: c.start, end: c.end, chapterIds: [c.id] });
  }
  return out;
}

// A ship ride (the gap between stops) belongs to the stop it is leaving.
export function stopIndexAt(stops: Stop[], t: number): number {
  let idx = 0;
  stops.forEach((s, i) => { if (t >= s.start) idx = i; });
  return idx;
}
export const chapterAt = (chapters: IVChapter[], t: number): IVChapter | undefined => chapters.filter(c => c.start <= t).pop() || chapters[0];

export function hintFor(chapter: IVChapter | undefined): string {
  return chapter?.hint || chapter?.keyPoint || 'Nothing to add here yet. Watch for the highlighted points.';
}

export function mergeRanges(rs: Range[]): Range[] {
  const sorted = rs.filter(r => r[1] - r[0] > 0.05).map(r => [r[0], r[1]] as Range).sort((a, b) => a[0] - b[0]);
  const out: Range[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1] + 0.5) last[1] = Math.max(last[1], r[1]); else out.push(r);
  }
  return out;
}

// Records only time that was actually played: a seek (jump) closes the current stretch and starts a new one, so skipping
// ahead never counts as watching.
export class WatchTracker {
  private ranges: Range[];
  private openStart: number | null = null;
  private last = 0;
  constructor(initial: Range[] = []) { this.ranges = mergeRanges(initial); }
  tick(t: number, playing: boolean) {
    if (!playing) { this.flush(); this.last = t; return; }
    if (this.openStart === null || Math.abs(t - this.last) > 1.5 || t < this.last - 0.1) { this.flush(); this.openStart = t; }
    this.last = t;
  }
  flush() {
    if (this.openStart !== null && this.last - this.openStart > 0.2) this.ranges = mergeRanges([...this.ranges, [this.openStart, this.last]]);
    this.openStart = null;
  }
  snapshot(): Range[] {
    const open: Range[] = this.openStart !== null && this.last - this.openStart > 0.2 ? [[this.openStart, this.last]] : [];
    return mergeRanges([...this.ranges, ...open]);
  }
  seconds() { return this.snapshot().reduce((n, r) => n + (r[1] - r[0]), 0); }
}
