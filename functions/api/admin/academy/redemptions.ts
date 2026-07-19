import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';

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
  const { context } = result;
  if (!hasPermission(context.admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  const { db } = context;
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'pending';

  const { results } = await db.prepare(`
    SELECT r.*, u.full_name, u.email
    FROM academy_credit_redemptions r
    JOIN academy_users u ON r.user_id = u.id
    WHERE r.status = ?
    ORDER BY r.created_at DESC
  `).bind(status).all();

  return corsResponse({ success: true, redemptions: results });
};

// Approve (mark paid) or reject a cash-payout request. Rejecting restores
// the escrowed balance to the student.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;
  if (!hasPermission(context.admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  const { db, admin } = context;

  try {
    const data = await request.json() as any;
    const { id, action, admin_notes } = data; // action: 'paid' | 'reject'
    if (!id || !['paid', 'reject'].includes(action)) return errorResponse('Missing or invalid fields', 400);

    const redemption = await db.prepare('SELECT id, user_id, amount, status FROM academy_credit_redemptions WHERE id = ?').bind(id).first() as any;
    if (!redemption) return errorResponse('Redemption request not found', 404);
    if (redemption.status !== 'pending') return errorResponse('Request already processed', 409);

    const now = new Date().toISOString();

    if (action === 'reject') {
      await db.prepare('UPDATE academy_users SET credit_balance = credit_balance + ? WHERE id = ?').bind(redemption.amount, redemption.user_id).run();
    }

    await db.prepare(`
      UPDATE academy_credit_redemptions SET status = ?, admin_notes = ?, processed_at = ? WHERE id = ?
    `).bind(action === 'paid' ? 'paid' : 'rejected', admin_notes || null, now, id).run();

    await logAdminAction(db, admin.email, `academy.redemption.${action}`, 'redemption', id, {}, request);

    return corsResponse({ success: true });
  } catch (err: any) {
    return errorResponse('Failed to process redemption', 500);
  }
};
