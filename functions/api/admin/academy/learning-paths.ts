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
  const id = url.searchParams.get('id');

  if (id) {
    const path = await db.prepare('SELECT * FROM academy_learning_paths WHERE id = ?').bind(id).first();
    if (!path) return errorResponse('Learning path not found', 404);
    const { results: courses } = await db.prepare(`
      SELECT lpc.id as link_id, lpc.sequence_order, c.id, c.title, c.status
      FROM academy_learning_path_courses lpc
      JOIN academy_courses c ON lpc.course_id = c.id
      WHERE lpc.path_id = ?
      ORDER BY lpc.sequence_order ASC
    `).bind(id).all();
    return corsResponse({ success: true, path, courses });
  }

  const { results } = await db.prepare(`
    SELECT p.*, (SELECT COUNT(*) FROM academy_learning_path_courses WHERE path_id = p.id) as course_count
    FROM academy_learning_paths p
    ORDER BY p.created_at DESC
  `).all();

  return corsResponse({ success: true, paths: results });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;
  if (!hasPermission(context.admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  const { db, admin } = context;

  try {
    const data = await request.json() as any;
    const { title, description, courseIds } = data;
    if (!title) return errorResponse('Missing title', 400);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare('INSERT INTO academy_learning_paths (id, title, description, created_at) VALUES (?, ?, ?, ?)')
      .bind(id, title, description || '', now).run();

    if (Array.isArray(courseIds)) {
      for (let i = 0; i < courseIds.length; i++) {
        await db.prepare('INSERT INTO academy_learning_path_courses (id, path_id, course_id, sequence_order) VALUES (?, ?, ?, ?)')
          .bind(crypto.randomUUID(), id, courseIds[i], i + 1).run();
      }
    }

    await logAdminAction(db, admin.email, 'academy.learning_path.create', 'learning_path', id, { title }, request);

    return corsResponse({ success: true, id });
  } catch (err: any) {
    return errorResponse('Failed to create learning path', 500);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;
  if (!hasPermission(context.admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  const { db, admin } = context;

  try {
    const data = await request.json() as any;
    const { id, title, description, courseIds } = data;
    if (!id) return errorResponse('Missing learning path id', 400);

    await db.prepare('UPDATE academy_learning_paths SET title = ?, description = ? WHERE id = ?')
      .bind(title, description || '', id).run();

    if (Array.isArray(courseIds)) {
      await db.prepare('DELETE FROM academy_learning_path_courses WHERE path_id = ?').bind(id).run();
      for (let i = 0; i < courseIds.length; i++) {
        await db.prepare('INSERT INTO academy_learning_path_courses (id, path_id, course_id, sequence_order) VALUES (?, ?, ?, ?)')
          .bind(crypto.randomUUID(), id, courseIds[i], i + 1).run();
      }
    }

    await logAdminAction(db, admin.email, 'academy.learning_path.update', 'learning_path', id, { title }, request);

    return corsResponse({ success: true });
  } catch (err: any) {
    return errorResponse('Failed to update learning path', 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;
  if (!hasPermission(context.admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  const { db, admin } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return errorResponse('Missing learning path id', 400);

  await db.prepare('DELETE FROM academy_learning_paths WHERE id = ?').bind(id).run();
  await logAdminAction(db, admin.email, 'academy.learning_path.delete', 'learning_path', id, {}, request);

  return corsResponse({ success: true });
};
