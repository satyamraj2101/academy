import { Env, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';
import { requireInstructor } from './_helpers';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// Grading queue scoped to the instructor's own courses only — same shape as
// the admin grading queue (assignment submissions + quiz short-answers).
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const forbidden = requireInstructor(authResult.context);
  if (forbidden) return forbidden;

  const { results: assignmentSubs } = await db.prepare(`
    SELECT sub.*, u.email as user_email, u.full_name as user_name, a.prompt_text, a.max_score
    FROM academy_assignment_submissions sub
    JOIN academy_users u ON sub.user_id = u.id
    JOIN academy_assignments a ON sub.assignment_id = a.id
    JOIN academy_lessons l ON a.lesson_id = l.id
    JOIN academy_modules m ON l.module_id = m.id
    JOIN academy_courses c ON m.course_id = c.id
    WHERE c.instructor_id = ?
    ORDER BY sub.submitted_at DESC
  `).bind(user.id).all();

  const { results: quizSubs } = await db.prepare(`
    SELECT s.id, s.status, s.answer_text as submission_text, s.submitted_at, s.points_awarded as grade_score, s.feedback_text,
           u.email as user_email, u.full_name as user_name,
           q.question_text as prompt_text, q.points as max_score
    FROM academy_quiz_short_answer_submissions s
    JOIN academy_users u ON s.user_id = u.id
    JOIN academy_quiz_questions q ON s.question_id = q.id
    JOIN academy_quizzes qz ON s.quiz_id = qz.id
    JOIN academy_courses c ON qz.course_id = c.id
    WHERE c.instructor_id = ?
    ORDER BY s.submitted_at DESC
  `).bind(user.id).all();

  const submissions = [
    ...(assignmentSubs as any[]).map(s => ({ ...s, kind: 'assignment' })),
    ...(quizSubs as any[]).map(s => ({ ...s, kind: 'quiz_short_answer' })),
  ].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

  return corsResponse({ success: true, submissions }, 200, request);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const forbidden = requireInstructor(authResult.context);
  if (forbidden) return forbidden;

  const data = await request.json() as any;
  const { submission_id, status, grade_score, feedback_text, kind } = data;
  if (!submission_id || !status) return errorResponse('Missing required fields', 400, request);

  if (kind === 'quiz_short_answer') {
    const owned = await db.prepare(`
      SELECT s.id FROM academy_quiz_short_answer_submissions s
      JOIN academy_quizzes qz ON s.quiz_id = qz.id
      JOIN academy_courses c ON qz.course_id = c.id
      WHERE s.id = ? AND c.instructor_id = ?
    `).bind(submission_id, user.id).first();
    if (!owned) return errorResponse('Submission not found or not from your course', 404, request);

    await db.prepare(`
      UPDATE academy_quiz_short_answer_submissions
      SET status = ?, points_awarded = ?, feedback_text = ?, graded_by = ?, graded_at = ?
      WHERE id = ?
    `).bind(status, grade_score ?? 0, feedback_text ?? null, user.email, new Date().toISOString(), submission_id).run();
  } else {
    const owned = await db.prepare(`
      SELECT sub.id FROM academy_assignment_submissions sub
      JOIN academy_assignments a ON sub.assignment_id = a.id
      JOIN academy_lessons l ON a.lesson_id = l.id
      JOIN academy_modules m ON l.module_id = m.id
      JOIN academy_courses c ON m.course_id = c.id
      WHERE sub.id = ? AND c.instructor_id = ?
    `).bind(submission_id, user.id).first();
    if (!owned) return errorResponse('Submission not found or not from your course', 404, request);

    await db.prepare(`
      UPDATE academy_assignment_submissions
      SET status = ?, grade_score = ?, feedback_text = ?, graded_by_admin_email = ?, graded_at = ?
      WHERE id = ?
    `).bind(status, grade_score ?? null, feedback_text ?? null, user.email, new Date().toISOString(), submission_id).run();
  }

  return corsResponse({ success: true }, 200, request);
};
