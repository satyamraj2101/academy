import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse } from '../middleware';

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
  const { db } = result.context;

  const { results: assignmentSubs } = await db.prepare(`
    SELECT sub.*, u.email as user_email, u.full_name as user_name, a.prompt_text, a.max_score
    FROM academy_assignment_submissions sub
    JOIN academy_users u ON sub.user_id = u.id
    JOIN academy_assignments a ON sub.assignment_id = a.id
    ORDER BY sub.submitted_at DESC
  `).all();

  const { results: quizSubs } = await db.prepare(`
    SELECT s.id, s.status, s.answer_text as submission_text, s.submitted_at, s.points_awarded as grade_score, s.feedback_text,
           u.email as user_email, u.full_name as user_name,
           q.question_text as prompt_text, q.points as max_score
    FROM academy_quiz_short_answer_submissions s
    JOIN academy_users u ON s.user_id = u.id
    JOIN academy_quiz_questions q ON s.question_id = q.id
    ORDER BY s.submitted_at DESC
  `).all();

  const submissions = [
    ...(assignmentSubs as any[]).map(s => ({ ...s, kind: 'assignment' })),
    ...(quizSubs as any[]).map(s => ({ ...s, kind: 'quiz_short_answer' })),
  ].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

  return corsResponse({ submissions });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { db, admin } = result.context;

  try {
    const data = await request.json() as any;
    const { submission_id, status, grade_score, feedback_text, kind } = data;

    if (!submission_id || !status) return errorResponse('Missing required fields', 400);

    if (kind === 'quiz_short_answer') {
      const nowIso = new Date().toISOString();
      await db.prepare(`
        UPDATE academy_quiz_short_answer_submissions
        SET status = ?, points_awarded = ?, feedback_text = ?, graded_by = ?, graded_at = ?
        WHERE id = ?
      `).bind(status, grade_score ?? 0, feedback_text ?? null, admin.email, nowIso, submission_id).run();

      await recomputeQuizAttemptScore(db, submission_id);
    } else {
      await db.prepare(`
        UPDATE academy_assignment_submissions
        SET status = ?, grade_score = ?, feedback_text = ?, graded_by_admin_email = ?, graded_at = ?
        WHERE id = ?
      `).bind(
        status, grade_score ?? null, feedback_text ?? null, admin.email, new Date().toISOString(), submission_id
      ).run();
    }

    return corsResponse({ success: true });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to grade submission', 500);
  }
};

// After a short-answer question is graded, recompute the parent quiz
// attempt's overall score/passed — auto-graded questions are re-scored from
// the attempt's stored answers, and every short-answer question on the quiz
// contributes its awarded points (0 if still pending grading).
async function recomputeQuizAttemptScore(db: D1Database, shortAnswerSubmissionId: string) {
  const submission = await db.prepare('SELECT attempt_id, quiz_id FROM academy_quiz_short_answer_submissions WHERE id = ?')
    .bind(shortAnswerSubmissionId).first() as any;
  if (!submission) return;

  const attempt = await db.prepare('SELECT id, answers FROM academy_quiz_attempts WHERE id = ?').bind(submission.attempt_id).first() as any;
  if (!attempt) return;

  const quiz = await db.prepare('SELECT passing_score FROM academy_quizzes WHERE id = ?').bind(submission.quiz_id).first() as any;
  const { results: questions } = await db.prepare('SELECT id, question_type, correct_answer, points FROM academy_quiz_questions WHERE quiz_id = ?')
    .bind(submission.quiz_id).all();
  const { results: shortAnswerSubs } = await db.prepare('SELECT question_id, status, points_awarded FROM academy_quiz_short_answer_submissions WHERE attempt_id = ?')
    .bind(submission.attempt_id).all();
  const shortAnswerByQuestion = new Map((shortAnswerSubs as any[]).map(s => [s.question_id, s]));

  let answers: Record<string, unknown> = {};
  try { answers = JSON.parse(attempt.answers || '{}'); } catch { /* ignore */ }

  let totalPoints = 0;
  let earnedPoints = 0;

  for (const q of questions as any[]) {
    totalPoints += q.points;
    if (q.question_type === 'short_answer') {
      const sub = shortAnswerByQuestion.get(q.id);
      earnedPoints += sub?.status === 'graded' ? (sub.points_awarded || 0) : 0;
    } else if (q.question_type === 'multi_select') {
      const normalize = (v: unknown): string[] => {
        try {
          const arr = typeof v === 'string' ? JSON.parse(v) : v;
          return Array.isArray(arr) ? [...arr].map(String).sort() : [];
        } catch { return []; }
      };
      const correct = normalize(q.correct_answer);
      const given = normalize(answers[q.id]);
      if (correct.length > 0 && correct.length === given.length && correct.every((c, i) => c === given[i])) {
        earnedPoints += q.points;
      }
    } else if (answers[q.id] === q.correct_answer) {
      earnedPoints += q.points;
    }
  }

  const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const passed = quiz && scorePercentage >= quiz.passing_score ? 1 : 0;

  await db.prepare('UPDATE academy_quiz_attempts SET score = ?, passed = ? WHERE id = ?')
    .bind(scorePercentage, passed, attempt.id).run();
}
