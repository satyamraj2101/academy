import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user, db } = authResult.context;
  const quizId = params.id as string;

  if (!quizId) return errorResponse('Quiz ID required', 400);

  // Fetch quiz details
  const quiz = await db.prepare(`
    SELECT q.id, q.time_limit_minutes, q.max_attempts, q.course_id
    FROM academy_quizzes q
    WHERE q.id = ?
  `).bind(quizId).first() as any;

  if (!quiz) return errorResponse('Quiz not found', 404);

  // Verify enrollment
  const enrollment = await db.prepare('SELECT id FROM academy_enrollments WHERE user_id = ? AND course_id = ? AND status = "active"')
    .bind(user.id, quiz.course_id).first();
    
  if (!enrollment) return errorResponse('Not enrolled in this course', 403);

  // Validate max attempts
  const { results: pastAttempts } = await db.prepare('SELECT id FROM academy_quiz_attempts WHERE user_id = ? AND quiz_id = ?').bind(user.id, quizId).all();
  if (quiz.max_attempts && pastAttempts.length >= quiz.max_attempts) {
    return errorResponse(`Maximum attempts (${quiz.max_attempts}) reached for this quiz.`, 403);
  }

  // Close any existing active sessions
  await db.prepare('UPDATE academy_quiz_sessions SET status = "abandoned" WHERE user_id = ? AND quiz_id = ? AND status = "in_progress"')
    .bind(user.id, quizId).run();

  const sessionId = crypto.randomUUID();
  const now = new Date();
  
  let expiresAt = null;
  if (quiz.time_limit_minutes) {
    const expires = new Date(now.getTime() + quiz.time_limit_minutes * 60000);
    expiresAt = expires.toISOString();
  }

  await db.prepare(`
    INSERT INTO academy_quiz_sessions (id, user_id, quiz_id, started_at, expires_at, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(sessionId, user.id, quizId, now.toISOString(), expiresAt, 'in_progress').run();

  return new Response(JSON.stringify({
    success: true,
    sessionId,
    expiresAt,
    timeLimitMinutes: quiz.time_limit_minutes
  }), { status: 200, headers: CORS_HEADERS });
};
