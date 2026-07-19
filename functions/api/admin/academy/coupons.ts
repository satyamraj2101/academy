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

  if (!hasPermission(context.admin, 'academy')) {
    return errorResponse('Forbidden — insufficient permissions', 403);
  }

  const { db } = context;

  const { results } = await db
    .prepare('SELECT * FROM academy_coupons ORDER BY created_at DESC')
    .all();

  return corsResponse({ coupons: results });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;

  if (!hasPermission(context.admin, 'academy')) {
    return errorResponse('Forbidden — insufficient permissions', 403);
  }

  const { db, admin } = context;

  try {
    const data = await request.json() as any;
    const code = (data.code || '').trim().toUpperCase();
    const discountType = data.discount_type;
    const discountAmount = Number(data.discount_amount);

    if (!code) return errorResponse('Coupon code is required', 400);
    if (discountType !== 'percentage' && discountType !== 'fixed') {
      return errorResponse("discount_type must be 'percentage' or 'fixed'", 400);
    }
    if (!Number.isFinite(discountAmount) || discountAmount <= 0) {
      return errorResponse('discount_amount must be a positive number', 400);
    }
    if (discountType === 'percentage' && discountAmount > 100) {
      return errorResponse('Percentage discount cannot exceed 100', 400);
    }

    const existing = await db.prepare('SELECT id FROM academy_coupons WHERE code = ?').bind(code).first();
    if (existing) return errorResponse('A coupon with this code already exists', 409);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO academy_coupons (id, code, discount_type, discount_amount, max_uses, uses, expires_at, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, 1, ?)
    `).bind(
      id, code, discountType, discountAmount,
      data.max_uses ? Number(data.max_uses) : null,
      data.expires_at || null,
      now
    ).run();

    await logAdminAction(db, admin.email, 'academy.coupon.create', 'coupon', id, { code, discountType, discountAmount }, request);

    return corsResponse({ success: true, id });
  } catch (err: any) {
    return errorResponse('Failed to create coupon', 500);
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;

  if (!hasPermission(context.admin, 'academy')) {
    return errorResponse('Forbidden — insufficient permissions', 403);
  }

  const { db, admin } = context;

  try {
    const data = await request.json() as any;
    const { id, is_active } = data;
    if (!id || typeof is_active === 'undefined') return errorResponse('Missing id or is_active', 400);

    await db.prepare('UPDATE academy_coupons SET is_active = ? WHERE id = ?').bind(is_active ? 1 : 0, id).run();

    await logAdminAction(db, admin.email, is_active ? 'academy.coupon.activate' : 'academy.coupon.deactivate', 'coupon', id, {}, request);

    return corsResponse({ success: true });
  } catch (err: any) {
    return errorResponse('Failed to update coupon', 500);
  }
};
