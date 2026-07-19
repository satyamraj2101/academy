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
    'SELECT * FROM academy_assignment_templates WHERE instructor_id = ? ORDER BY created_at DESC'
  ).bind(admin.id).all();

  return corsResponse({ success: true, templates: results });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;
  if (!hasPermission(context.admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  const { db, admin } = context;
  try {
    const data = await request.json() as any;
    const { title, prompt_text, submission_type, max_score } = data;
    if (!title?.trim() || !prompt_text?.trim()) return errorResponse('title and prompt_text are required', 400);

    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO academy_assignment_templates (id, instructor_id, title, prompt_text, submission_type, max_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, admin.id, title.trim(), prompt_text.trim(), submission_type || 'text', max_score ?? 100, new Date().toISOString()).run();

    await logAdminAction(db, admin.email, 'academy.assignment_template.create', 'assignment_template', id, { title }, request);
    return corsResponse({ success: true, id });
  } catch (err: any) {
    console.error('Failed to create assignment template:', err);
    return errorResponse('Failed to create assignment template', 500);
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

  await db.prepare('DELETE FROM academy_assignment_templates WHERE id = ? AND instructor_id = ?').bind(id, admin.id).run();
  await logAdminAction(db, admin.email, 'academy.assignment_template.delete', 'assignment_template', id, {}, request);
  return corsResponse({ success: true });
};
