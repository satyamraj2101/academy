import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';

interface Env {
  DB?: D1Database;
  ADMIN_JWT_AUDIENCE?: string;
  ENV?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
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
    const { quiz_id, question_text, question_type, options, correct_answer, explanation, points } = data;

    if (!quiz_id || !question_text) return errorResponse('Missing required fields', 400);
    if (question_type !== 'short_answer' && !correct_answer) return errorResponse('Missing required fields', 400);

    const maxRow = await db.prepare('SELECT MAX(sort_order) as maxOrder FROM academy_quiz_questions WHERE quiz_id = ?').bind(quiz_id).first() as any;
    const nextOrder = (maxRow?.maxOrder ?? 0) + 1;
    const id = crypto.randomUUID();

    await db.prepare(`
      INSERT INTO academy_quiz_questions (id, quiz_id, question_text, question_type, options, correct_answer, explanation, points, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, quiz_id, question_text, question_type || 'mcq',
      JSON.stringify(options || []), correct_answer, explanation || null, points ?? 1, nextOrder
    ).run();

    await logAdminAction(db, admin.email, 'academy.quiz_question.create', 'quiz_question', id, { quiz_id }, request);

    return corsResponse({ success: true, id });
  } catch (err: any) {
    console.error('Failed to create quiz question:', err);
    return errorResponse('Failed to create question', 500);
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
    const { id, question_text, question_type, options, correct_answer, explanation, points, sort_order } = data;
    if (!id) return errorResponse('Missing question id', 400);

    await db.prepare(`
      UPDATE academy_quiz_questions
      SET question_text = ?, question_type = ?, options = ?, correct_answer = ?, explanation = ?, points = ?, sort_order = ?
      WHERE id = ?
    `).bind(
      question_text, question_type || 'mcq', JSON.stringify(options || []),
      correct_answer, explanation || null, points ?? 1, sort_order, id
    ).run();

    await logAdminAction(db, admin.email, 'academy.quiz_question.update', 'quiz_question', id, {}, request);

    return corsResponse({ success: true });
  } catch (err: any) {
    return errorResponse('Failed to update question', 500);
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
  if (!id) return errorResponse('Missing question id', 400);

  try {
    await db.prepare('DELETE FROM academy_quiz_questions WHERE id = ?').bind(id).run();
    await logAdminAction(db, admin.email, 'academy.quiz_question.delete', 'quiz_question', id, {}, request);
    return corsResponse({ success: true });
  } catch (err: any) {
    return errorResponse('Failed to delete question', 500);
  }
};
