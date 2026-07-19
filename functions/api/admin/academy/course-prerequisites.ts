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
  const courseId = url.searchParams.get('courseId');
  if (!courseId) return errorResponse('Missing courseId', 400);

  const { results } = await db.prepare(`
    SELECT p.id, p.prerequisite_course_id, p.enforcement, c.title
    FROM academy_course_prerequisites p
    JOIN academy_courses c ON p.prerequisite_course_id = c.id
    WHERE p.course_id = ?
  `).bind(courseId).all();

  return corsResponse({ success: true, prerequisites: results });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;
  if (!hasPermission(context.admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  const { db, admin } = context;

  try {
    const data = await request.json() as any;
    const { course_id, prerequisite_course_id, enforcement } = data;
    if (!course_id || !prerequisite_course_id) return errorResponse('Missing required fields', 400);
    if (course_id === prerequisite_course_id) return errorResponse('A course cannot be its own prerequisite', 400);

    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO academy_course_prerequisites (id, course_id, prerequisite_course_id, enforcement)
      VALUES (?, ?, ?, ?)
    `).bind(id, course_id, prerequisite_course_id, enforcement === 'soft' ? 'soft' : 'hard').run();

    await logAdminAction(db, admin.email, 'academy.prerequisite.create', 'prerequisite', id, { course_id, prerequisite_course_id }, request);

    return corsResponse({ success: true, id });
  } catch (err: any) {
    return errorResponse('Failed to add prerequisite — it may already exist', 500);
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
  if (!id) return errorResponse('Missing prerequisite id', 400);

  await db.prepare('DELETE FROM academy_course_prerequisites WHERE id = ?').bind(id).run();
  await logAdminAction(db, admin.email, 'academy.prerequisite.delete', 'prerequisite', id, {}, request);

  return corsResponse({ success: true });
};
