import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const assignmentId = params.id as string;

  const assignment = await db.prepare(`
    SELECT a.id, a.lesson_id, a.prompt_text, a.submission_type, a.max_score, l.module_id, m.course_id
    FROM academy_assignments a
    JOIN academy_lessons l ON a.lesson_id = l.id
    JOIN academy_modules m ON l.module_id = m.id
    WHERE a.id = ?
  `).bind(assignmentId).first() as any;

  if (!assignment) return errorResponse('Assignment not found', 404, request);

  const enrollment = await db.prepare('SELECT id FROM academy_enrollments WHERE user_id = ? AND course_id = ? AND status = "active"')
    .bind(user.id, assignment.course_id).first();
  if (!enrollment) return errorResponse('Not enrolled in this course', 403, request);

  const submission = await db.prepare(`
    SELECT id, submission_text, submission_file_url, status, grade_score, feedback_text, submitted_at, graded_at
    FROM academy_assignment_submissions
    WHERE assignment_id = ? AND user_id = ?
    ORDER BY submitted_at DESC LIMIT 1
  `).bind(assignmentId, user.id).first();

  return corsResponse({ success: true, assignment, submission: submission || null }, 200, request);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const assignmentId = params.id as string;

  const assignment = await db.prepare(`
    SELECT a.id, a.submission_type, l.module_id, m.course_id
    FROM academy_assignments a
    JOIN academy_lessons l ON a.lesson_id = l.id
    JOIN academy_modules m ON l.module_id = m.id
    WHERE a.id = ?
  `).bind(assignmentId).first() as any;

  if (!assignment) return errorResponse('Assignment not found', 404, request);

  const enrollment = await db.prepare('SELECT id FROM academy_enrollments WHERE user_id = ? AND course_id = ? AND status = "active"')
    .bind(user.id, assignment.course_id).first();
  if (!enrollment) return errorResponse('Not enrolled in this course', 403, request);

  let body: { submissionText?: string; submissionFileUrl?: string };
  try {
    body = await request.json() as { submissionText?: string; submissionFileUrl?: string };
  } catch {
    return errorResponse('Invalid JSON body', 400, request);
  }

  const needsText = assignment.submission_type === 'text' || assignment.submission_type === 'both';
  const needsFile = assignment.submission_type === 'file' || assignment.submission_type === 'both';
  if (needsText && !body.submissionText?.trim()) return errorResponse('A text response is required', 400, request);
  if (needsFile && !body.submissionFileUrl && !needsText) return errorResponse('A file submission is required', 400, request);

  const now = new Date().toISOString();
  const existing = await db.prepare('SELECT id FROM academy_assignment_submissions WHERE assignment_id = ? AND user_id = ?')
    .bind(assignmentId, user.id).first() as any;

  if (existing) {
    await db.prepare(`
      UPDATE academy_assignment_submissions
      SET submission_text = ?, submission_file_url = ?, status = 'pending', grade_score = NULL, feedback_text = NULL, graded_by_admin_email = NULL, submitted_at = ?, graded_at = NULL
      WHERE id = ?
    `).bind(body.submissionText || null, body.submissionFileUrl || null, now, existing.id).run();
  } else {
    const submissionId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO academy_assignment_submissions (id, assignment_id, user_id, submission_text, submission_file_url, status, submitted_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).bind(submissionId, assignmentId, user.id, body.submissionText || null, body.submissionFileUrl || null, now).run();

    // Auto-assign 2 random peers (enrolled in the same course, excluding the
    // author) to review this submission — instructors can reassign or add
    // more reviewers manually from the Grading Desk.
    const { results: peers } = await db.prepare(`
      SELECT user_id FROM academy_enrollments WHERE course_id = ? AND status = 'active' AND user_id != ?
    `).bind(assignment.course_id, user.id).all();
    const shuffled = [...(peers as any[])].sort(() => Math.random() - 0.5).slice(0, 2);
    for (const peer of shuffled) {
      await db.prepare(`
        INSERT INTO academy_peer_reviews (id, submission_id, reviewer_user_id, status, assigned_by, assigned_at)
        VALUES (?, ?, ?, 'pending', 'system', ?)
      `).bind(crypto.randomUUID(), submissionId, peer.user_id, now).run();
    }
  }

  return corsResponse({ success: true }, 200, request);
};
