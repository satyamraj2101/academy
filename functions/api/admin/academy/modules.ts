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
  const url = new URL(request.url);
  const courseId = url.searchParams.get('courseId');

  if (!courseId) return errorResponse('Missing courseId', 400);

  const { results } = await db.prepare('SELECT * FROM academy_modules WHERE course_id = ? ORDER BY sort_order ASC').bind(courseId).all();

  return corsResponse({ modules: results });
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
    const { course_id, title, description, is_published, drip_days, unlock_date } = data;

    if (!course_id || !title) return errorResponse('Missing required fields', 400);

    const id = data.id || crypto.randomUUID();

    // Get max sort_order
    const maxRow = await db.prepare('SELECT MAX(sort_order) as maxOrder FROM academy_modules WHERE course_id = ?').bind(course_id).first() as any;
    const nextOrder = (maxRow?.maxOrder ?? 0) + 1;

    await db.prepare(`
      INSERT INTO academy_modules (id, course_id, title, description, sort_order, is_published, drip_days, unlock_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, course_id, title, description || '', nextOrder, is_published === undefined ? 1 : is_published, drip_days ?? null, unlock_date || null).run();

    await logAdminAction(db, admin.email, 'academy.module.create', 'module', id, { title }, request);

    return corsResponse({ success: true, id });
  } catch (err: any) {
    return errorResponse('Failed to create module', 500);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;

  if (!hasPermission(context.admin, 'academy')) {
    return errorResponse('Forbidden — insufficient permissions', 403);
  }

  const { db, admin } = context;

  try {
    const data = await request.json() as any;
    const { id, title, description, sort_order, is_published, drip_days, unlock_date } = data;

    if (!id) return errorResponse('Missing module id', 400);

    await db.prepare(`
      UPDATE academy_modules
      SET title = ?, description = ?, sort_order = ?, is_published = ?, drip_days = ?, unlock_date = ?
      WHERE id = ?
    `).bind(title, description || '', sort_order, is_published === undefined ? 1 : is_published, drip_days ?? null, unlock_date || null, id).run();

    await logAdminAction(db, admin.email, 'academy.module.update', 'module', id, { title }, request);

    return corsResponse({ success: true });
  } catch (err: any) {
    return errorResponse('Failed to update module', 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;

  if (!hasPermission(context.admin, 'academy')) {
    return errorResponse('Forbidden — insufficient permissions', 403);
  }

  const { db, admin } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) return errorResponse('Missing module id', 400);

  try {
    await db.prepare('DELETE FROM academy_modules WHERE id = ?').bind(id).run();
    await logAdminAction(db, admin.email, 'academy.module.delete', 'module', id, {}, request);

    return corsResponse({ success: true });
  } catch (err: any) {
    return errorResponse('Failed to delete module', 500);
  }
};
