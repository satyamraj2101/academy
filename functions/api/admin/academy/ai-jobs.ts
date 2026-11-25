import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';

interface Env { DB?: D1Database }

const JOB_TYPES = ['course_from_prompt', 'course_from_document', 'course_from_transcript'];
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

  const id = new URL(request.url).searchParams.get('id');
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
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
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
  const payload = JSON.stringify(body.payload);
  if (payload.length > MAX_PAYLOAD_BYTES) return errorResponse('payload too large — upload the file and pass source_url instead', 413);

  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO academy_ai_jobs (id, type, status, payload, progress, created_by, created_at)
    VALUES (?, ?, 'queued', ?, '{"step":"queued","done":0,"total":0}', ?, ?)
  `).bind(id, body.type, payload, admin.email, new Date().toISOString()).run();

  await logAdminAction(db, admin.email, 'academy.ai_job.enqueue', 'ai_job', id, { type: body.type }, request);
  return corsResponse({ id, status: 'queued' }, 202);
};
