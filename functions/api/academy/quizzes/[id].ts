import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';
import { generateCredentialId, signCertificate } from '../../utils/certificates';
import { onQuizPassed } from '../_gamification';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user, db } = authResult.context;
  const quizId = params.id as string;

  if (!quizId) return errorResponse('Quiz ID required', 400);

  // Fetch quiz details
  const quiz = await db.prepare(`
    SELECT q.id, q.title, q.passing_score, q.max_attempts, q.time_limit_minutes, q.course_id
    FROM academy_quizzes q
    WHERE q.id = ?
  `).bind(quizId).first() as any;

  if (!quiz) return errorResponse('Quiz not found', 404);

  // Verify enrollment
  const enrollment = await db.prepare('SELECT id FROM academy_enrollments WHERE user_id = ? AND course_id = ? AND status = "active"')
    .bind(user.id, quiz.course_id).first();
    
  if (!enrollment) return errorResponse('Not enrolled in this course', 403);

  // Fetch questions (DO NOT return correct_answer!)
  const { results: questions } = await db.prepare(`
    SELECT id, question_text, question_type, options, points
    FROM academy_quiz_questions
    WHERE quiz_id = ?
    ORDER BY sort_order ASC
  `).bind(quizId).all();

  const formattedQuestions = questions.map((q: any) => ({
    ...q,
    options: q.options ? JSON.parse(q.options) : []
  }));

  // Fetch past attempts
  const { results: attempts } = await db.prepare(`
    SELECT id, score, passed, attempted_at
    FROM academy_quiz_attempts
    WHERE user_id = ? AND quiz_id = ?
    ORDER BY attempted_at DESC
  `).bind(user.id, quizId).all();

  return new Response(JSON.stringify({
    success: true,
    quiz,
    questions: formattedQuestions,
    attempts
  }), { status: 200, headers: CORS_HEADERS });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user, db } = authResult.context;
  const quizId = params.id as string;

  let body: { answers: Record<string, string>, sessionId: string };
  try {
    body = await request.json() as { answers: Record<string, string>, sessionId: string };
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (!body.sessionId) {
    return errorResponse('Session ID required', 400);
  }

  // Fetch quiz details
  const quiz = await db.prepare('SELECT passing_score, course_id, max_attempts, time_limit_minutes, is_certification_exam FROM academy_quizzes WHERE id = ?').bind(quizId).first() as any;
  if (!quiz) return errorResponse('Quiz not found', 404);

  // Verify enrollment
  const enrollment = await db.prepare('SELECT id FROM academy_enrollments WHERE user_id = ? AND course_id = ? AND status = "active"')
    .bind(user.id, quiz.course_id).first();
  if (!enrollment) return errorResponse('Not enrolled in this course', 403);

  // Verify session and time limit
  const session = await db.prepare('SELECT id, started_at, expires_at, status FROM academy_quiz_sessions WHERE id = ? AND user_id = ? AND quiz_id = ?')
    .bind(body.sessionId, user.id, quizId).first() as any;

  if (!session) return errorResponse('Invalid session', 403);
  if (session.status !== 'in_progress') return errorResponse('Session already completed or abandoned', 403);

  const now = new Date();
  if (session.expires_at) {
    const expires = new Date(session.expires_at);
    // 60s grace period for network latency
    if (now.getTime() > expires.getTime() + 60000) {
      await db.prepare('UPDATE academy_quiz_sessions SET status = "expired" WHERE id = ?').bind(body.sessionId).run();
      return errorResponse('Time limit exceeded', 403);
    }
  }

  const timeTakenSeconds = Math.round((now.getTime() - new Date(session.started_at).getTime()) / 1000);

  const { results: questions } = await db.prepare('SELECT id, question_text, question_type, correct_answer, explanation, points FROM academy_quiz_questions WHERE quiz_id = ?').bind(quizId).all();

  // Short-answer questions are instructor-graded, not auto-scored — they're
  // excluded from the auto-graded percentage until a grader awards points,
  // at which point the attempt's score/passed are recomputed (see grading.ts).
  let totalPoints = 0;
  let earnedPoints = 0;
  const attemptId = crypto.randomUUID();
  const nowIso = now.toISOString();
  const shortAnswerInserts: D1PreparedStatement[] = [];
  const review: any[] = [];

  const normalizeSet = (v: unknown): string[] => {
    try {
      const arr = typeof v === 'string' ? JSON.parse(v) : v;
      return Array.isArray(arr) ? [...arr].map(String).sort() : [];
    } catch { return []; }
  };

  for (const q of questions as any[]) {
    const userAnswer = body.answers[q.id];

    totalPoints += q.points;

    if (q.question_type === 'short_answer') {
      // Earns 0 points until an instructor grades it (see grading.ts, which
      // recomputes this attempt's score/passed once points are awarded).
      shortAnswerInserts.push(db.prepare(`
        INSERT INTO academy_quiz_short_answer_submissions (id, attempt_id, question_id, user_id, quiz_id, answer_text, status, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
      `).bind(crypto.randomUUID(), attemptId, q.id, user.id, quizId, typeof userAnswer === 'string' ? userAnswer : '', nowIso));
      review.push({ questionId: q.id, questionText: q.question_text, type: q.question_type, userAnswer, correct: null, pendingGrading: true });
    } else if (q.question_type === 'multi_select') {
      const correct = normalizeSet(q.correct_answer);
      const given = normalizeSet(userAnswer);
      const isCorrect = correct.length > 0 && correct.length === given.length && correct.every((c, i) => c === given[i]);
      if (isCorrect) earnedPoints += q.points;
      review.push({ questionId: q.id, questionText: q.question_text, type: q.question_type, userAnswer, correctAnswer: correct, correct: isCorrect, explanation: q.explanation || null });
    } else {
      // Covers 'mcq' and 'true_false' — both are exact-match against a single stored answer.
      const isCorrect = userAnswer === q.correct_answer;
      if (isCorrect) earnedPoints += q.points;
      review.push({ questionId: q.id, questionText: q.question_text, type: q.question_type, userAnswer, correctAnswer: q.correct_answer, correct: isCorrect, explanation: q.explanation || null });
    }
  }

  const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const passed = scorePercentage >= quiz.passing_score ? 1 : 0;

  await db.prepare(`
    INSERT INTO academy_quiz_attempts (id, user_id, quiz_id, score, answers, passed, attempted_at, time_taken_seconds, session_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(attemptId, user.id, quizId, scorePercentage, JSON.stringify(body.answers), passed, nowIso, timeTakenSeconds, body.sessionId).run();

  if (shortAnswerInserts.length > 0) {
    await db.batch(shortAnswerInserts);
  }

  if (passed) {
    await onQuizPassed(db, user.id, scorePercentage);
  }

  await db.prepare('UPDATE academy_quiz_sessions SET status = "completed", completed_at = ? WHERE id = ?')
    .bind(nowIso, body.sessionId).run();

  let credentialId = null;

  // Issue certificate if passed and it's a certification exam
  if (passed && quiz.is_certification_exam) {
    // Check if they already have one
    const existingCert = await db.prepare('SELECT id FROM academy_user_certificates WHERE user_id = ? AND course_id = ?')
      .bind(user.id, quiz.course_id).first();

    if (!existingCert && env.CERTIFICATE_SECRET) {
      const [userRow, courseRow] = await Promise.all([
        db.prepare('SELECT full_name FROM academy_users WHERE id = ?').bind(user.id).first() as Promise<any>,
        db.prepare('SELECT title FROM academy_courses WHERE id = ?').bind(quiz.course_id).first() as Promise<any>,
      ]);

      credentialId = await generateCredentialId();
      const certId = crypto.randomUUID();
      const legacyCertId = crypto.randomUUID();

      const metadata = {
        studentName: userRow?.full_name,
        courseTitle: courseRow?.title,
        quizAttemptId: attemptId,
        issuedAt: nowIso
      };
      const signature = await signCertificate(metadata, env.CERTIFICATE_SECRET);

      await db.prepare(`
        INSERT INTO certificates (id, student_name, course_name, issue_date, status)
        VALUES (?, ?, ?, ?, 'valid')
      `).bind(legacyCertId, userRow?.full_name, courseRow?.title, nowIso).run();

      await db.prepare(`
        INSERT INTO academy_user_certificates (id, user_id, certificate_id, course_id, quiz_attempt_id, issued_at, credential_id, signature, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        certId, user.id, legacyCertId, quiz.course_id, attemptId, nowIso,
        credentialId, signature, JSON.stringify(metadata)
      ).run();
    }
  }

  return new Response(JSON.stringify({
    success: true,
    score: scorePercentage,
    passed: !!passed,
    attemptId,
    credentialId,
    review
  }), { status: 200, headers: CORS_HEADERS });
};
