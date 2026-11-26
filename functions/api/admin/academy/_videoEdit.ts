// Rules for "rebuild this lesson video with AI" jobs. Pure functions (no network, no database) so they are unit-tested;
// ai-jobs.ts applies them when a job is queued.

export const VIDEO_EDIT_JOB = 'lesson_video_edit';
export const COURSE_JOB_TYPES = ['course_from_prompt', 'course_from_document', 'course_from_transcript'] as const;
export const MAX_VIDEO_REQUEST = 1500;

export interface VideoEditPayload { courseId: string; lessonId: string; videoId: string; instruction: string }

const id = (v: unknown) => (typeof v === 'string' && /^[\w-]{1,80}$/.test(v) ? v : '');

/**
 * Cleans the payload an admin sends. The request may be empty: that means "rebuild the video from the lesson's current text".
 * Only the four known fields are kept, so nothing else can ride along into the job queue.
 */
export function validateVideoEdit(payload: any): { ok: true; payload: VideoEditPayload } | { ok: false; error: string } {
  const courseId = id(payload?.courseId), lessonId = id(payload?.lessonId), videoId = id(payload?.videoId);
  if (!courseId || !lessonId || !videoId) return { ok: false, error: 'courseId, lessonId and videoId are required' };
  const instruction = typeof payload?.instruction === 'string' ? payload.instruction.trim() : '';
  if (instruction.length > MAX_VIDEO_REQUEST) return { ok: false, error: `Keep the request under ${MAX_VIDEO_REQUEST} characters.` };
  return { ok: true, payload: { courseId, lessonId, videoId, instruction } };
}

/** Which job types a caller may ask to claim. Anything unknown is dropped; an empty result means "any" (the old behaviour). */
export function claimTypes(raw: unknown): string[] {
  const known = new Set<string>([...COURSE_JOB_TYPES, VIDEO_EDIT_JOB]);
  return (Array.isArray(raw) ? raw : []).filter((t): t is string => typeof t === 'string' && known.has(t));
}

/** The URL and token that wake the cloud video worker, when both are configured. */
export function kickConfig(env: { MODAL_JOBS_URL?: string; MODAL_JOBS_TOKEN?: string }): { url: string; token: string } | null {
  const url = (env.MODAL_JOBS_URL || '').trim(), token = (env.MODAL_JOBS_TOKEN || '').trim();
  if (!token || !/^https:\/\/[^\s]+$/.test(url)) return null;
  return { url, token };
}
