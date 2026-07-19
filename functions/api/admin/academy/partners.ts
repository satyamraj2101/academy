import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse } from '../middleware';

interface Env {
  DB?: D1Database;
  ADMIN_JWT_AUDIENCE?: string;
  ENV?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { db } = result.context;

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'pending';

  const { results } = await db.prepare(`
    SELECT id, email, full_name, partner_status, partner_applied_at, created_at
    FROM academy_users
    WHERE partner_status = ?
    ORDER BY partner_applied_at DESC
  `).bind(status).all();

  return corsResponse({ partners: results });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { db } = result.context;

  try {
    const data = await request.json() as any;
    const { user_id, action } = data; // action: 'approve' | 'reject'

    if (!user_id || !action) return errorResponse('Missing required fields', 400);

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await db.prepare(`
      UPDATE academy_users 
      SET partner_status = ?, updated_at = ?
      WHERE id = ?
    `).bind(newStatus, new Date().toISOString(), user_id).run();

    return corsResponse({ success: true, partner_status: newStatus });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update partner status', 500);
  }
};
