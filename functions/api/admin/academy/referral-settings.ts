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

  const settings = await context.db.prepare('SELECT * FROM academy_referral_settings WHERE id = ?').bind('default').first();
  return corsResponse({ success: true, settings });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;
  if (!hasPermission(context.admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  const { db, admin } = context;

  try {
    const data = await request.json() as any;
    const { l1_rate, l2_rate, min_payout_cents } = data;
    if (l1_rate < 0 || l1_rate > 1 || l2_rate < 0 || l2_rate > 1) return errorResponse('Rates must be between 0 and 1', 400);

    await db.prepare(`
      UPDATE academy_referral_settings SET l1_rate = ?, l2_rate = ?, min_payout_cents = ?, updated_at = ? WHERE id = 'default'
    `).bind(l1_rate, l2_rate, min_payout_cents, new Date().toISOString()).run();

    await logAdminAction(db, admin.email, 'academy.referral_settings.update', 'referral_settings', 'default', { l1_rate, l2_rate, min_payout_cents }, request);

    return corsResponse({ success: true });
  } catch (err: any) {
    return errorResponse('Failed to update referral settings', 500);
  }
};
