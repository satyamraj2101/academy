import { Env, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';
import { requireInstructor, assertOwnsCourse, assertOwnsQuiz } from './_helpers';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const forbidden = requireInstructor(authResult.context);
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const courseId = url.searchParams.get('courseId');
  const id = url.searchParams.get('id');

  if (id) {
    if (!(await assertOwnsQuiz(db, id, user.id))) return errorResponse('Quiz not found or not owned by you', 404, request);
    const quiz = await db.prepare('SELECT * FROM academy_quizzes WHERE id = ?').bind(id).first();
    const { results: questions } = await db.prepare('SELECT * FROM academy_quiz_questions WHERE quiz_id = ? ORDER BY sort_order ASC').bind(id).all();
    return corsResponse({ success: true, quiz, questions }, 200, request);
  }

  if (!courseId) return errorResponse('Missing courseId or id', 400, request);
  if (!(await assertOwnsCourse(db, courseId, user.id))) return errorResponse('Course not found or not owned by you', 404, request);

  const { results: quizzes } = await db.prepare('SELECT * FROM academy_quizzes WHERE course_id = ?').bind(courseId).all();
  return corsResponse({ success: true, quizzes }, 200, request);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const forbidden = requireInstructor(authResult.context);
  if (forbidden) return forbidden;

  const data = await request.json() as any;
  const { course_id, module_id, title, passing_score, max_attempts, time_limit_minutes } = data;
  if (!course_id || !title) return errorResponse('Missing required fields', 400, request);

  if (!(await assertOwnsCourse(db, course_id, user.id))) return errorResponse('Course not found or not owned by you', 404, request);

  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO academy_quizzes (id, course_id, module_id, title, passing_score, max_attempts, time_limit_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, course_id, module_id || null, title, passing_score ?? 70, max_attempts ?? 3, time_limit_minutes ?? null).run();

  return corsResponse({ success: true, id }, 200, request);
};
