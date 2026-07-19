import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';

interface Env {
  DB?: D1Database;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;
  if (!hasPermission(context.admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  const { db, admin } = context;
  const { results } = await db.prepare(
    'SELECT * FROM academy_quiz_templates WHERE instructor_id = ? ORDER BY created_at DESC'
  ).bind(admin.id).all();

  const templates = results.map((r: any) => ({ ...r, questions: JSON.parse(r.questions_json || '[]') }));
  return corsResponse({ success: true, templates });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;
  if (!hasPermission(context.admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  const { db, admin } = context;
  try {
    const data = await request.json() as any;
    const { title, passing_score, max_attempts, time_limit_minutes, questions } = data;
    if (!title?.trim() || !Array.isArray(questions) || questions.length === 0) {
      return errorResponse('title and at least one question are required', 400);
    }

    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO academy_quiz_templates (id, instructor_id, title, passing_score, max_attempts, time_limit_minutes, questions_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, admin.id, title.trim(), passing_score ?? 70, max_attempts ?? 3, time_limit_minutes ?? null,
      JSON.stringify(questions), new Date().toISOString()
    ).run();

    await logAdminAction(db, admin.email, 'academy.quiz_template.create', 'quiz_template', id, { title }, request);
    return corsResponse({ success: true, id });
  } catch (err: any) {
    console.error('Failed to create quiz template:', err);
    return errorResponse('Failed to create quiz template', 500);
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
  if (!id) return errorResponse('Missing template id', 400);

  await db.prepare('DELETE FROM academy_quiz_templates WHERE id = ? AND instructor_id = ?').bind(id, admin.id).run();
  await logAdminAction(db, admin.email, 'academy.quiz_template.delete', 'quiz_template', id, {}, request);
  return corsResponse({ success: true });
};
