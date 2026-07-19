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
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '25', 10);
  const offset = (page - 1) * pageSize;

  const { results } = await db.prepare(`
    SELECT id, email, full_name, role, is_active, credit_balance, created_at
    FROM academy_users
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(pageSize, offset).all();

  const countRow = await db.prepare('SELECT COUNT(*) as total FROM academy_users').first() as any;
  const total = countRow?.total ?? 0;

  return corsResponse({ students: results, total, page, pageSize });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { db } = result.context;

  try {
    const data = await request.json() as any;
    const { user_id, credit_balance } = data;

    if (!user_id || credit_balance === undefined) {
      return errorResponse('Missing user_id or credit_balance', 400);
    }

    await db.prepare(`
      UPDATE academy_users 
      SET credit_balance = ?, updated_at = ?
      WHERE id = ?
    `).bind(credit_balance, new Date().toISOString(), user_id).run();

    return corsResponse({ success: true, credit_balance });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update credit balance', 500);
  }
};
