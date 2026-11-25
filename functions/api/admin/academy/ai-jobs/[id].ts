import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse } from '../../middleware';

interface Env { DB?: D1Database }

const LEASE_SECONDS = 300;

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// PATCH /ai-jobs/:id — runner-only progress/heartbeat/completion.
// Body: { progress?, status?: 'done'|'failed', result?, error? }. Every call extends the lease.
export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await verifyAdminRequest(request, env);
  if ('error' in auth) return auth.error;
  const { admin, db } = auth.context;
  if (admin.role !== 'service' && admin.role !== 'superadmin') return errorResponse('Forbidden — runner only', 403);

  let body: any;
  try { body = await request.json(); } catch { return errorResponse('Invalid JSON body', 400); }
  if (body.status && !['done', 'failed'].includes(body.status)) return errorResponse("status must be 'done' or 'failed'", 400);

  const now = new Date();
  const res = await db.prepare(`
    UPDATE academy_ai_jobs SET
      progress = COALESCE(?, progress),
      status = COALESCE(?, status),
      result = COALESCE(?, result),
      error = COALESCE(?, error),
      finished_at = COALESCE(?, finished_at),
      locked_until = ?
    WHERE id = ? AND status = 'running'
  `).bind(
    body.progress ? JSON.stringify(body.progress) : null,
    body.status ?? null,
    body.result ? JSON.stringify(body.result) : null,
    body.error ? String(body.error).slice(0, 2000) : null,
    body.status ? now.toISOString() : null,
    new Date(now.getTime() + LEASE_SECONDS * 1000).toISOString(),
    params.id
  ).run();

  if (!res.meta.changes) return errorResponse('Job not found or not running', 404);
  return corsResponse({ success: true });
};
