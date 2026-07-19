import { Env, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';
import { requireInstructor, assertOwnsQuiz } from './_helpers';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const forbidden = requireInstructor(authResult.context);
  if (forbidden) return forbidden;

  const data = await request.json() as any;
  const { quiz_id, question_text, question_type, options, correct_answer, explanation, points } = data;
  if (!quiz_id || !question_text) return errorResponse('Missing required fields', 400, request);
  if (question_type !== 'short_answer' && !correct_answer) return errorResponse('Missing required fields', 400, request);

  if (!(await assertOwnsQuiz(db, quiz_id, user.id))) return errorResponse('Quiz not found or not owned by you', 404, request);

  const maxRow = await db.prepare('SELECT MAX(sort_order) as maxOrder FROM academy_quiz_questions WHERE quiz_id = ?').bind(quiz_id).first() as any;
  const nextOrder = (maxRow?.maxOrder ?? 0) + 1;
  const id = crypto.randomUUID();

  await db.prepare(`
    INSERT INTO academy_quiz_questions (id, quiz_id, question_text, question_type, options, correct_answer, explanation, points, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, quiz_id, question_text, question_type || 'mcq', JSON.stringify(options || []), correct_answer || '', explanation || null, points ?? 1, nextOrder).run();

  return corsResponse({ success: true, id }, 200, request);
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const forbidden = requireInstructor(authResult.context);
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return errorResponse('Missing question id', 400, request);

  const question = await db.prepare(`
    SELECT qq.quiz_id FROM academy_quiz_questions qq WHERE qq.id = ?
  `).bind(id).first() as any;
  if (!question || !(await assertOwnsQuiz(db, question.quiz_id, user.id))) {
    return errorResponse('Question not found or not owned by you', 404, request);
  }

  await db.prepare('DELETE FROM academy_quiz_questions WHERE id = ?').bind(id).run();
  return corsResponse({ success: true }, 200, request);
};
