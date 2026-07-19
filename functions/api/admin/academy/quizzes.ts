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
  const id = url.searchParams.get('id');

  if (id) {
    const quiz = await db.prepare('SELECT * FROM academy_quizzes WHERE id = ?').bind(id).first();
    if (!quiz) return errorResponse('Quiz not found', 404);
    const { results: questions } = await db.prepare('SELECT * FROM academy_quiz_questions WHERE quiz_id = ? ORDER BY sort_order ASC').bind(id).all();
    return corsResponse({ success: true, quiz, questions });
  }

  if (!courseId) return errorResponse('Missing courseId', 400);
  const { results } = await db.prepare('SELECT * FROM academy_quizzes WHERE course_id = ? ORDER BY title ASC').bind(courseId).all();
  return corsResponse({ success: true, quizzes: results });
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
    const { course_id, module_id, title, passing_score, max_attempts, time_limit_minutes, is_certification_exam } = data;

    if (!course_id || !title) return errorResponse('Missing required fields', 400);

    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO academy_quizzes (id, course_id, module_id, title, passing_score, max_attempts, time_limit_minutes, is_certification_exam)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, course_id, module_id || null, title,
      passing_score ?? 70, max_attempts ?? 3, time_limit_minutes || null, is_certification_exam ? 1 : 0
    ).run();

    await logAdminAction(db, admin.email, 'academy.quiz.create', 'quiz', id, { title }, request);

    return corsResponse({ success: true, id });
  } catch (err: any) {
    console.error('Failed to create quiz:', err);
    return errorResponse('Failed to create quiz', 500);
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
    const { id, title, passing_score, max_attempts, time_limit_minutes, is_certification_exam } = data;
    if (!id) return errorResponse('Missing quiz id', 400);

    await db.prepare(`
      UPDATE academy_quizzes
      SET title = ?, passing_score = ?, max_attempts = ?, time_limit_minutes = ?, is_certification_exam = ?
      WHERE id = ?
    `).bind(title, passing_score ?? 70, max_attempts ?? 3, time_limit_minutes || null, is_certification_exam ? 1 : 0, id).run();

    await logAdminAction(db, admin.email, 'academy.quiz.update', 'quiz', id, { title }, request);

    return corsResponse({ success: true });
  } catch (err: any) {
    return errorResponse('Failed to update quiz', 500);
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
  if (!id) return errorResponse('Missing quiz id', 400);

  try {
    await db.prepare('DELETE FROM academy_quizzes WHERE id = ?').bind(id).run();
    await logAdminAction(db, admin.email, 'academy.quiz.delete', 'quiz', id, {}, request);
    return corsResponse({ success: true });
  } catch (err: any) {
    return errorResponse('Failed to delete quiz', 500);
  }
};
