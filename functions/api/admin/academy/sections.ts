import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';

interface Env {
  DB?: D1Database;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

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
    const { lesson_id, section_type, sort_order, content, is_mandatory } = data;

    if (!lesson_id || !section_type) {
      return errorResponse('Missing required fields', 400);
    }

    const id = crypto.randomUUID();

    await db.prepare(`
      INSERT INTO academy_lesson_sections (id, lesson_id, section_type, sort_order, content, is_mandatory, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, lesson_id, section_type, sort_order || 1, content || '', is_mandatory ? 1 : 0, new Date().toISOString()
    ).run();

    await logAdminAction(db, admin.email, 'academy.section.create', 'section', id, { lesson_id, section_type }, request);

    return corsResponse({ success: true, id });
  } catch (err: any) {
    console.error('Failed to create section:', err);
    return errorResponse('Failed to create section', 500);
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
    const { id, section_type, sort_order, content, is_mandatory } = data;

    if (!id) return errorResponse('Missing section id', 400);

    await db.prepare(`
      UPDATE academy_lesson_sections 
      SET section_type = ?, sort_order = ?, content = ?, is_mandatory = ?
      WHERE id = ?
    `).bind(
      section_type, sort_order, content, is_mandatory ? 1 : 0, id
    ).run();

    await logAdminAction(db, admin.email, 'academy.section.update', 'section', id, { section_type }, request);

    return corsResponse({ success: true });
  } catch (err: any) {
    console.error('Failed to update section:', err);
    return errorResponse('Failed to update section', 500);
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

  if (!id) return errorResponse('Missing section id', 400);

  try {
    await db.prepare('DELETE FROM academy_lesson_sections WHERE id = ?').bind(id).run();
    await logAdminAction(db, admin.email, 'academy.section.delete', 'section', id, {}, request);

    return corsResponse({ success: true });
  } catch (err: any) {
    console.error('Failed to delete section:', err);
    return errorResponse('Failed to delete section', 500);
  }
};
