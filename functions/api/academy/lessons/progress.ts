import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';
import { issueCertificateIfEligible } from '../../utils/certificates';
import { onLessonCompleted, onCourseCompleted, onCertificateIssued } from '../_gamification';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user, db } = authResult.context;

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const lessonId = body.lessonId as string;
  if (!lessonId) return errorResponse('lessonId is required', 400);

  // Ensure lesson exists and get course ID
  const lessonData = await db.prepare(`
    SELECT m.course_id 
    FROM academy_lessons l
    JOIN academy_modules m ON l.module_id = m.id
    WHERE l.id = ?
  `).bind(lessonId).first() as any;

  if (!lessonData) return errorResponse('Lesson not found', 404);
  const courseId = lessonData.course_id;

  // Ensure enrolled
  const enrollment = await db.prepare('SELECT id FROM academy_enrollments WHERE user_id = ? AND course_id = ?').bind(user.id, courseId).first();
  if (!enrollment) return errorResponse('Not enrolled', 403);

  const progressId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Only award lesson-completion gamification the first time this lesson is
  // completed — the upsert below runs on every call (e.g. re-navigating back
  // to an already-complete lesson), so check prior state first.
  const priorProgress = await db.prepare('SELECT completed FROM academy_lesson_progress WHERE user_id = ? AND lesson_id = ?').bind(user.id, lessonId).first() as any;
  const wasAlreadyCompleted = !!priorProgress?.completed;

  // Upsert progress
  await db.prepare(`
    INSERT INTO academy_lesson_progress (id, user_id, lesson_id, completed, completed_at)
    VALUES (?, ?, ?, 1, ?)
    ON CONFLICT(user_id, lesson_id) DO UPDATE SET completed = 1, completed_at = ?
  `).bind(progressId, user.id, lessonId, now, now).run();

  if (!wasAlreadyCompleted) {
    await onLessonCompleted(db, user.id);
  }

  // Recalculate progress percent (rough calculation)
  // Get total lessons
  const totalLessonsRes = await db.prepare(`
    SELECT COUNT(l.id) as total
    FROM academy_lessons l
    JOIN academy_modules m ON l.module_id = m.id
    WHERE m.course_id = ? AND l.is_published = 1
  `).bind(courseId).first() as any;
  
  // Get completed lessons
  const completedLessonsRes = await db.prepare(`
    SELECT COUNT(p.id) as completed
    FROM academy_lesson_progress p
    JOIN academy_lessons l ON p.lesson_id = l.id
    JOIN academy_modules m ON l.module_id = m.id
    WHERE m.course_id = ? AND p.user_id = ? AND p.completed = 1
  `).bind(courseId, user.id).first() as any;

  const total = totalLessonsRes?.total || 1;
  const completed = completedLessonsRes?.completed || 0;
  let percent = Math.round((completed / total) * 100);
  if (percent > 100) percent = 100;

  const enrollmentRow = await db.prepare('SELECT progress_percent FROM academy_enrollments WHERE id = ?').bind(enrollment.id).first() as any;
  const wasAlreadyDone = (enrollmentRow?.progress_percent || 0) >= 100;

  await db.prepare('UPDATE academy_enrollments SET progress_percent = ? WHERE id = ?').bind(percent, enrollment.id).run();

  let credentialId: string | null = null;
  if (percent === 100) {
    if (!wasAlreadyDone) {
      await onCourseCompleted(db, user.id);
    }
    credentialId = await issueCertificateIfEligible(db, user.id, courseId, env.CERTIFICATE_SECRET);
    if (credentialId) {
      await onCertificateIssued(db, user.id);
    }
  }

  return new Response(JSON.stringify({ success: true, progress_percent: percent, credentialId }), { status: 200, headers: CORS_HEADERS });
};
