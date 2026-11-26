// Rules for "rebuild this lesson video with AI" jobs. Pure functions (no network, no database) so they are unit-tested;
// ai-jobs.ts applies them when a job is queued.

export const VIDEO_EDIT_JOB = 'lesson_video_edit';
export const COURSE_JOB_TYPES = ['course_from_prompt', 'course_from_document', 'course_from_transcript'] as const;
export const MAX_VIDEO_REQUEST = 1500;

export const MAX_SCRIPT_BYTES = 200_000;
export const MAX_SCENES = 10;

export interface VideoEditPayload { courseId: string; lessonId: string; /** The video being changed; empty when the job creates the lesson's first video. */ videoId: string; create?: boolean; instruction: string; script?: { title?: string; scenes: Record<string, unknown>[] } }

const id = (v: unknown) => (typeof v === 'string' && /^[\w-]{1,80}$/.test(v) ? v : '');

/**
 * Cleans the payload an admin sends. The request may be empty: that means "rebuild the video from the lesson's current text".
 * Only the four known fields are kept, so nothing else can ride along into the job queue.
 */
export function validateVideoEdit(payload: any): { ok: true; payload: VideoEditPayload } | { ok: false; error: string } {
  const create = payload?.create === true;
  const courseId = id(payload?.courseId), lessonId = id(payload?.lessonId), videoId = create ? '' : id(payload?.videoId);
  if (!courseId || !lessonId || (!create && !videoId)) return { ok: false, error: create ? 'courseId and lessonId are required' : 'courseId, lessonId and videoId are required' };
  if (create && payload?.script !== undefined) return { ok: false, error: 'A new video is written by the AI from the lesson, not from a script.' };
  const instruction = typeof payload?.instruction === 'string' ? payload.instruction.trim() : '';
  if (instruction.length > MAX_VIDEO_REQUEST) return { ok: false, error: `Keep the request under ${MAX_VIDEO_REQUEST} characters.` };
  // An edited script (the scenes the admin changed by hand). The runner validates every scene; here it only has to be a sane size and shape.
  let script: VideoEditPayload['script'];
  if (payload?.script !== undefined) {
    const sc = payload.script;
    const scenes = sc?.scenes;
    if (!sc || typeof sc !== 'object' || !Array.isArray(scenes) || scenes.length < 1 || scenes.length > MAX_SCENES || scenes.some((x: unknown) => !x || typeof x !== 'object' || Array.isArray(x))) return { ok: false, error: `The edited script must have 1 to ${MAX_SCENES} scenes.` };
    if (JSON.stringify(sc).length > MAX_SCRIPT_BYTES) return { ok: false, error: 'The edited script is too large.' };
    script = { ...(typeof sc.title === 'string' ? { title: sc.title.slice(0, 120) } : {}), scenes };
  }
  return { ok: true, payload: { courseId, lessonId, videoId, ...(create ? { create: true } : {}), instruction, ...(script ? { script } : {}) } };
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
