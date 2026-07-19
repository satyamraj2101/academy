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
  const moduleId = url.searchParams.get('moduleId');
  const id = url.searchParams.get('id');

  if (id) {
    const lesson = await db.prepare('SELECT * FROM academy_lessons WHERE id = ?').bind(id).first();
    if (!lesson) return errorResponse('Lesson not found', 404);
    return corsResponse({ lesson });
  }

  if (!moduleId) return errorResponse('Missing moduleId or id', 400);

  const { results } = await db.prepare('SELECT * FROM academy_lessons WHERE module_id = ? ORDER BY sort_order ASC').bind(moduleId).all();

  return corsResponse({ lessons: results });
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
    const { module_id, title, content_type, content_body, video_url, video_duration_minutes, pdf_url, is_preview, is_published, drip_days, unlock_date } = data;

    if (!module_id || !title || !content_type) return errorResponse('Missing required fields', 400);

    const id = data.id || crypto.randomUUID();

    // Get max sort_order
    const maxRow = await db.prepare('SELECT MAX(sort_order) as maxOrder FROM academy_lessons WHERE module_id = ?').bind(module_id).first() as any;
    const nextOrder = (maxRow?.maxOrder ?? 0) + 1;

    await db.prepare(`
      INSERT INTO academy_lessons (id, module_id, title, content_type, content_body, video_url, video_duration_minutes, pdf_url, sort_order, is_preview, is_published, drip_days, unlock_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, module_id, title, content_type, content_body || null, video_url || null, video_duration_minutes || null,
      pdf_url || null, nextOrder, is_preview === undefined ? 0 : is_preview, is_published === undefined ? 1 : is_published,
      drip_days ?? null, unlock_date || null
    ).run();

    await logAdminAction(db, admin.email, 'academy.lesson.create', 'lesson', id, { title }, request);

    return corsResponse({ success: true, id });
  } catch (err: any) {
    return errorResponse('Failed to create lesson', 500);
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
    const { id, module_id, title, content_type, content_body, video_url, video_duration_minutes, pdf_url, sort_order, is_preview, is_published, drip_days, unlock_date } = data;

    if (!id) return errorResponse('Missing lesson id', 400);

    // module_id is optional — omitted on a normal content save, present when
    // dragging a lesson into a different module in the Curriculum tab.
    if (module_id) {
      await db.prepare(`
        UPDATE academy_lessons
        SET module_id = ?, title = ?, content_type = ?, content_body = ?, video_url = ?, video_duration_minutes = ?, pdf_url = ?, sort_order = ?, is_preview = ?, is_published = ?, drip_days = ?, unlock_date = ?
        WHERE id = ?
      `).bind(
        module_id, title, content_type, content_body || null, video_url || null, video_duration_minutes || null,
        pdf_url || null, sort_order, is_preview === undefined ? 0 : is_preview, is_published === undefined ? 1 : is_published,
        drip_days ?? null, unlock_date || null, id
      ).run();
    } else {
      await db.prepare(`
        UPDATE academy_lessons
        SET title = ?, content_type = ?, content_body = ?, video_url = ?, video_duration_minutes = ?, pdf_url = ?, sort_order = ?, is_preview = ?, is_published = ?, drip_days = ?, unlock_date = ?
        WHERE id = ?
      `).bind(
        title, content_type, content_body || null, video_url || null, video_duration_minutes || null,
        pdf_url || null, sort_order, is_preview === undefined ? 0 : is_preview, is_published === undefined ? 1 : is_published,
        drip_days ?? null, unlock_date || null, id
      ).run();
    }

    await logAdminAction(db, admin.email, 'academy.lesson.update', 'lesson', id, { title }, request);

    return corsResponse({ success: true });
  } catch (err: any) {
    return errorResponse('Failed to update lesson', 500);
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

  if (!id) return errorResponse('Missing lesson id', 400);

  try {
    await db.prepare('DELETE FROM academy_lessons WHERE id = ?').bind(id).run();
    await logAdminAction(db, admin.email, 'academy.lesson.delete', 'lesson', id, {}, request);

    return corsResponse({ success: true });
  } catch (err: any) {
    return errorResponse('Failed to delete lesson', 500);
  }
};
