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
  const lessonId = url.searchParams.get('lessonId');
  if (!lessonId) return errorResponse('Missing lessonId', 400);

  const { results } = await db.prepare('SELECT * FROM academy_assignments WHERE lesson_id = ?').bind(lessonId).all();
  return corsResponse({ success: true, assignments: results });
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
    const { lesson_id, prompt_text, submission_type, max_score } = data;
    if (!lesson_id || !prompt_text) return errorResponse('Missing required fields', 400);

    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO academy_assignments (id, lesson_id, prompt_text, submission_type, max_score)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, lesson_id, prompt_text, submission_type || 'text', max_score ?? 100).run();

    await logAdminAction(db, admin.email, 'academy.assignment.create', 'assignment', id, { lesson_id }, request);

    return corsResponse({ success: true, id });
  } catch (err: any) {
    console.error('Failed to create assignment:', err);
    return errorResponse('Failed to create assignment', 500);
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
    const { id, prompt_text, submission_type, max_score } = data;
    if (!id) return errorResponse('Missing assignment id', 400);

    await db.prepare(`
      UPDATE academy_assignments SET prompt_text = ?, submission_type = ?, max_score = ? WHERE id = ?
    `).bind(prompt_text, submission_type || 'text', max_score ?? 100, id).run();

    await logAdminAction(db, admin.email, 'academy.assignment.update', 'assignment', id, {}, request);

    return corsResponse({ success: true });
  } catch (err: any) {
    return errorResponse('Failed to update assignment', 500);
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
  if (!id) return errorResponse('Missing assignment id', 400);

  try {
    await db.prepare('DELETE FROM academy_assignments WHERE id = ?').bind(id).run();
    await logAdminAction(db, admin.email, 'academy.assignment.delete', 'assignment', id, {}, request);
    return corsResponse({ success: true });
  } catch (err: any) {
    return errorResponse('Failed to delete assignment', 500);
  }
};
