// SpotCLM Admin API — Settings CRUD
import { verifyAdminRequest, logAdminAction, corsResponse, corsOptionsResponse, errorResponse, hasPermission } from './middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<any> = async ({ request, env }) => {
  const auth = await verifyAdminRequest(request, env);
  if ('error' in auth) return auth.error;
  
  if (!hasPermission(auth.context.admin, 'settings')) {
    return errorResponse('Forbidden — Requires settings permission', 403);
  }

  const { results } = await auth.context.db.prepare('SELECT key, value FROM system_settings').all();
  return corsResponse({ settings: results });
};

export const onRequestPatch: PagesFunction<any> = async ({ request, env }) => {
  const auth = await verifyAdminRequest(request, env);
  if ('error' in auth) return auth.error;
  
  if (!hasPermission(auth.context.admin, 'settings')) {
    return errorResponse('Forbidden', 403);
  }

  let body: any;
  try { body = await request.json(); } catch { return errorResponse('Invalid JSON'); }

  const { key, value } = body;
  if (!key || typeof value !== 'string') return errorResponse('key and value required');

  await auth.context.db.prepare(
    'INSERT INTO system_settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by'
  ).bind(key, value, new Date().toISOString(), auth.context.admin.email).run();

  await logAdminAction(auth.context.db, auth.context.admin.email, 'update', 'setting', key, { new_value: value }, request);

  return corsResponse({ ok: true });
};
