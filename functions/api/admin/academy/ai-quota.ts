import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse } from '../middleware';
import { parseKeys, quotaView, validateQuotaPost } from './_aiQuota';

interface Env { DB?: D1Database }

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

const today = () => new Date().toISOString().slice(0, 10);

// Both calls are for the workers (a service key), never for the admin screens.
// GET  /ai-quota?keys=groq:openai/gpt-oss-20b,gemini:gemini-3.5-flash-lite -> { quota: { <key>: { calls, tokens, cooldownUntil, reason } } }
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyAdminRequest(request, env);
  if ('error' in auth) return auth.error;
  const { admin, db } = auth.context;
  if (admin.role !== 'service' && admin.role !== 'superadmin') return errorResponse('Forbidden — workers only', 403);

  const keys = parseKeys(new URL(request.url).searchParams.get('keys'));
  const quota: Record<string, unknown> = {};
  if (keys.length) {
    const { results } = await db.prepare(`SELECT key, day, calls, tokens, cooldown_until, reason FROM academy_ai_quota WHERE key IN (${keys.map(() => '?').join(',')})`).bind(...keys).all();
    const rows = new Map(((results || []) as any[]).map(r => [r.key, r]));
    for (const k of keys) quota[k] = quotaView(rows.get(k), today());
  }
  return corsResponse({ quota });
};

// POST { key, calls?, tokens?, cooldownUntil?, reason? } adds to today's use of a provider+model and/or records a cooldown.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyAdminRequest(request, env);
  if ('error' in auth) return auth.error;
  const { admin, db } = auth.context;
  if (admin.role !== 'service' && admin.role !== 'superadmin') return errorResponse('Forbidden — workers only', 403);

  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse('Invalid JSON body', 400); }
  const v = validateQuotaPost(body);
  if ('error' in v) return errorResponse(v.error, 400);
  const { key, calls, tokens, cooldownUntil, reason } = v.post;
  const day = today(), now = new Date().toISOString();

  // One statement, so two workers reporting at the same moment never lose each other's counts. A new day starts the counts over.
  await db.prepare(`
    INSERT INTO academy_ai_quota (key, day, calls, tokens, cooldown_until, reason, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      calls = CASE WHEN day = excluded.day THEN calls + excluded.calls ELSE excluded.calls END,
      tokens = CASE WHEN day = excluded.day THEN tokens + excluded.tokens ELSE excluded.tokens END,
      cooldown_until = CASE WHEN excluded.cooldown_until IS NOT NULL AND (cooldown_until IS NULL OR excluded.cooldown_until > cooldown_until) THEN excluded.cooldown_until ELSE cooldown_until END,
      reason = CASE WHEN excluded.cooldown_until IS NOT NULL THEN excluded.reason ELSE reason END,
      day = excluded.day,
      updated_at = excluded.updated_at
  `).bind(key, day, calls, tokens, cooldownUntil, reason, now).run();
  return corsResponse({ success: true });
};
