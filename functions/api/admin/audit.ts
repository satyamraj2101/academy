// SpotCLM Admin API — Audit Log
import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission } from './middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<any> = async ({ request, env }) => {
  const auth = await verifyAdminRequest(request, env);
  if ('error' in auth) return auth.error;
  
  if (!hasPermission(auth.context.admin, 'settings')) {
    return errorResponse('Forbidden', 403);
  }

  const { results } = await auth.context.db.prepare(
    'SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 100'
  ).all();

  return corsResponse({ logs: results });
};
