// Version history for lesson blocks. Every save (or restore) that changes a lesson first keeps what was there, newest 20 per lesson.
// The pure helpers are unit-tested; replaceSections() is the one place that writes sections, so a save can never skip the snapshot.

export const MAX_VERSIONS = 20;
export const MAX_SNAPSHOT_CHARS = 700_000; // a D1 row is limited to about 1 MB

export interface SectionSnap { section_type: string; content: string; is_mandatory: number }

const norm = (s: any): SectionSnap => ({ section_type: String(s?.section_type || ''), content: String(s?.content ?? ''), is_mandatory: s?.is_mandatory ? 1 : 0 });

/** Stored rows (any order) to the plain list that is kept in a version. */
export function toSnapshot(rows: any[]): SectionSnap[] {
  return [...rows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map(norm);
}

export function sameSnapshot(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => { const p = norm(x), q = norm(b[i]); return p.section_type === q.section_type && p.content === q.content && p.is_mandatory === q.is_mandatory; });
}

/** One line for the history list. */
export function describeSnapshot(snap: SectionSnap[]): string {
  const text = snap.filter(s => s.section_type === 'markdown').reduce((n, s) => n + s.content.length, 0);
  const has = (t: string) => snap.some(s => s.section_type === t);
  const parts = [`${snap.length} block${snap.length === 1 ? '' : 's'}`, `${text.toLocaleString('en-US')} characters of text`];
  if (has('interactive_video')) parts.push('video');
  if (has('quiz')) parts.push('quiz');
  if (has('assignment')) parts.push('assignment');
  return parts.join(', ');
}

/** The JSON to store, or null when it is too large to keep. */
export function snapshotJson(snap: SectionSnap[]): string | null {
  const json = JSON.stringify(snap);
  return json.length > MAX_SNAPSHOT_CHARS ? null : json;
}

/**
 * Replaces all sections of a lesson in one atomic batch, keeping the previous blocks as a version first (unless nothing changes, or
 * the same blocks are already the newest version). Returns whether a version was kept.
 */
export async function replaceSections(db: D1Database, lessonId: string, incoming: any[], by: string, reason: 'save' | 'restore'): Promise<{ kept: boolean }> {
  const { results } = await db.prepare('SELECT section_type, content, is_mandatory, sort_order FROM academy_lesson_sections WHERE lesson_id = ? ORDER BY sort_order').bind(lessonId).all();
  const current = toSnapshot((results || []) as any[]);
  // Saving the same blocks again changes nothing, so it must not look like an edit (it would void a review).
  if (current.length && sameSnapshot(current, incoming)) return { kept: false };
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];

  let kept = false;
  if (current.length && !sameSnapshot(current, incoming)) {
    const json = snapshotJson(current);
    const last = await db.prepare('SELECT sections_json FROM academy_lesson_versions WHERE lesson_id = ? ORDER BY created_at DESC LIMIT 1').bind(lessonId).first() as any;
    let lastSame = false;
    try { lastSame = !!last && sameSnapshot(JSON.parse(last.sections_json), current); } catch { /* unreadable: keep a new one */ }
    if (json && !lastSame) {
      statements.push(
        db.prepare('INSERT INTO academy_lesson_versions (id, lesson_id, created_at, created_by, reason, sections_json, summary) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(crypto.randomUUID(), lessonId, now, by, reason, json, describeSnapshot(current)),
        db.prepare('DELETE FROM academy_lesson_versions WHERE lesson_id = ? AND id NOT IN (SELECT id FROM academy_lesson_versions WHERE lesson_id = ? ORDER BY created_at DESC LIMIT ?)')
          .bind(lessonId, lessonId, MAX_VERSIONS),
      );
      kept = true;
    }
  }

  statements.push(
    db.prepare('DELETE FROM academy_lesson_sections WHERE lesson_id = ?').bind(lessonId),
    ...incoming.map((s, i) => db.prepare('INSERT INTO academy_lesson_sections (id, lesson_id, section_type, sort_order, content, is_mandatory, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), lessonId, s.section_type, i + 1, s.content || '', s.is_mandatory ? 1 : 0, now)),
  );
  await db.batch(statements);
  return { kept };
}
