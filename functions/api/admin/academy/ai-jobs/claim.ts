import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse } from '../../middleware';
import { claimTypes } from '../_videoEdit';

interface Env { DB?: D1Database }

const LEASE_SECONDS = 300;
const MAX_ATTEMPTS = 3;

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// POST /ai-jobs/claim — runner-only. Atomically takes the oldest queued job, or a running job whose
// lease expired (runner crashed). One statement, so two runners can never claim the same job.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyAdminRequest(request, env);
  if ('error' in auth) return auth.error;
  const { admin, db } = auth.context;
  if (admin.role !== 'service' && admin.role !== 'superadmin') return errorResponse('Forbidden — runner only', 403);

  const now = new Date();
  const nowIso = now.toISOString();
  const lease = new Date(now.getTime() + LEASE_SECONDS * 1000).toISOString();

  // Jobs that keep losing their runner stop retrying instead of looping forever.
  await db.prepare(`
    UPDATE academy_ai_jobs SET status = 'failed', error = 'Runner lost the job ' || attempts || ' times', finished_at = ?
    WHERE status = 'running' AND locked_until < ? AND attempts >= ?
  `).bind(nowIso, nowIso, MAX_ATTEMPTS).run();

  // A worker may ask for only some kinds of job ({ types: [...] }) so the course writer and the video builder never take each
  // other's work. No list means any kind.
  let asked: unknown;
  try { asked = ((await request.json()) as any)?.types; } catch { /* empty body: any kind */ }
  const types = claimTypes(asked);
  const typeFilter = types.length ? ` AND type IN (${types.map(() => '?').join(',')})` : '';

  const job = await db.prepare(`
    UPDATE academy_ai_jobs
    SET status = 'running', attempts = attempts + 1, locked_until = ?, started_at = COALESCE(started_at, ?)
    WHERE id = (
      SELECT id FROM academy_ai_jobs
      WHERE (status = 'queued' OR (status = 'running' AND locked_until < ? AND attempts < ?))${typeFilter}
      ORDER BY created_at LIMIT 1
    )
    RETURNING *
  `).bind(lease, nowIso, nowIso, MAX_ATTEMPTS, ...types).first() as any;

  if (!job) return corsResponse({ job: null });
  const j = (s: string | null) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
  return corsResponse({ job: { ...job, payload: j(job.payload), progress: j(job.progress) } });
};
