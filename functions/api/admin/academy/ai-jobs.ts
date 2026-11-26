import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';

import { COURSE_JOB_TYPES, VIDEO_EDIT_JOB, kickConfig, validateVideoEdit } from './_videoEdit';

interface Env { DB?: D1Database; MODAL_JOBS_URL?: string; MODAL_JOBS_TOKEN?: string }

const JOB_TYPES: string[] = [...COURSE_JOB_TYPES, VIDEO_EDIT_JOB];
const MAX_PAYLOAD_BYTES = 900_000; // D1 row limit is 1MB; leave headroom for the other columns

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

const j = (s: string | null) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
const parseJob = (row: any) => (row ? { ...row, payload: j(row.payload), progress: j(row.progress), result: j(row.result) } : row);

// GET /ai-jobs            -> recent jobs (payload omitted; can be large)
// GET /ai-jobs?id=<id>    -> one job with payload, for status polling
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyAdminRequest(request, env);
  if ('error' in auth) return auth.error;
  if (!hasPermission(auth.context.admin, 'academy')) return errorResponse('Forbidden', 403);
  const { db } = auth.context;

  const params = new URL(request.url).searchParams;
  const id = params.get('id');
  // GET /ai-jobs?lessonId=<id> -> the latest video-edit jobs for that lesson, so the editor can show one that is still running
  // GET /ai-jobs?courseId=<id> -> the latest video jobs of a course (with the lesson each is for), to show bulk progress
  const courseIdFilter = params.get('courseId');
  if (courseIdFilter) {
    const { results } = await db.prepare(`
      SELECT id, status, progress, error, created_at, finished_at, json_extract(payload, '$.lessonId') AS lesson_id FROM academy_ai_jobs
      WHERE type = ? AND json_extract(payload, '$.courseId') = ? ORDER BY created_at DESC LIMIT 100
    `).bind(VIDEO_EDIT_JOB, courseIdFilter).all();
    return corsResponse((results || []).map(parseJob));
  }
  const lessonId = params.get('lessonId');
  if (lessonId) {
    const { results } = await db.prepare(`
      SELECT id, type, status, progress, result, error, created_at, started_at, finished_at FROM academy_ai_jobs
      WHERE type = ? AND json_extract(payload, '$.lessonId') = ? ORDER BY created_at DESC LIMIT 5
    `).bind(VIDEO_EDIT_JOB, lessonId).all();
    return corsResponse((results || []).map(parseJob));
  }
  if (id) {
    const row = await db.prepare('SELECT * FROM academy_ai_jobs WHERE id = ?').bind(id).first();
    return row ? corsResponse(parseJob(row)) : errorResponse('Job not found', 404);
  }
  const { results } = await db.prepare(`
    SELECT id, type, status, progress, result, error, attempts, created_by, created_at, started_at, finished_at
    FROM academy_ai_jobs ORDER BY created_at DESC LIMIT 50
  `).all();
  return corsResponse((results || []).map(parseJob));
};

// POST /ai-jobs { type, payload } -> enqueue. Returns immediately.
export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const auth = await verifyAdminRequest(request, env);
  if ('error' in auth) return auth.error;
  const { admin, db } = auth.context;
  if (!hasPermission(admin, 'academy')) return errorResponse('Forbidden', 403);

  let body: { type?: string; payload?: unknown };
  try { body = await request.json() as any; } catch { return errorResponse('Invalid JSON body', 400); }

  if (!body.type || !JOB_TYPES.includes(body.type)) {
    return errorResponse(`type must be one of: ${JOB_TYPES.join(', ')}`, 400);
  }
  if (!body.payload || typeof body.payload !== 'object') return errorResponse('payload object is required', 400);
  let jobPayload: unknown = body.payload;
  if (body.type === VIDEO_EDIT_JOB) {
    const v = validateVideoEdit(body.payload);
    if ('error' in v) return errorResponse(v.error, 400);
    const { courseId, lessonId, videoId, create } = v.payload;
    const lesson = await db.prepare('SELECT l.id FROM academy_lessons l JOIN academy_modules m ON m.id = l.module_id WHERE l.id = ? AND m.course_id = ?').bind(lessonId, courseId).first();
    if (!lesson) return errorResponse('Lesson not found in this course', 404);
    const { results } = await db.prepare("SELECT content FROM academy_lesson_sections WHERE lesson_id = ? AND section_type = 'interactive_video'").bind(lessonId).all();
    const hasVideo = ((results || []) as any[]).some(r => { try { return JSON.parse(r.content).videoId === videoId; } catch { return false; } });
    if (create && ((results || []) as any[]).length > 0) return errorResponse('This lesson already has a video. Use "Change video" to redo it.', 409);
    if (!create && !hasVideo) return errorResponse('That video is not in this lesson any more. Reload the lesson and try again.', 404);
    const busy = await db.prepare("SELECT id FROM academy_ai_jobs WHERE type = ? AND status IN ('queued','running') AND json_extract(payload, '$.lessonId') = ?").bind(VIDEO_EDIT_JOB, lessonId).first();
    if (busy) return errorResponse('This video is already being rebuilt. Wait for it to finish.', 409);
    jobPayload = v.payload;
  }
  const payload = JSON.stringify(jobPayload);
  if (payload.length > MAX_PAYLOAD_BYTES) return errorResponse('payload too large — upload the file and pass source_url instead', 413);

  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO academy_ai_jobs (id, type, status, payload, progress, created_by, created_at)
    VALUES (?, ?, 'queued', ?, '{"step":"queued","done":0,"total":0}', ?, ?)
  `).bind(id, body.type, payload, admin.email, new Date().toISOString()).run();

  await logAdminAction(db, admin.email, 'academy.ai_job.enqueue', 'ai_job', id, { type: body.type }, request);

  // Wake the cloud worker so the job starts now. If it is not configured or does not answer, the job simply waits in the queue
  // (the worker also drains the queue whenever it is started by hand).
  const kick = kickConfig(env);
  if (kick) {
    waitUntil(fetch(kick.url, { method: 'POST', headers: { Authorization: `Bearer ${kick.token}` }, signal: AbortSignal.timeout(15_000) }).then(() => {}, () => {}));
  }
  return corsResponse({ id, status: 'queued', started: !!kick }, 202);
};
