import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const courseId = params.id as string;
  if (!courseId) return errorResponse('Course ID required', 400);

  const { user, db } = authResult.context;

  // Verify enrollment
  const enrollment = await db.prepare('SELECT id FROM academy_enrollments WHERE user_id = ? AND course_id = ?').bind(user.id, courseId).first();
  if (!enrollment) {
    return errorResponse('Not enrolled in this course', 403);
  }

  // Find the first uncompleted lesson, or just the first lesson overall if all are completed
  const { results: lessons } = await db.prepare(`
    SELECT l.id, lp.completed
    FROM academy_lessons l
    JOIN academy_modules m ON l.module_id = m.id
    LEFT JOIN academy_lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = ?
    WHERE m.course_id = ?
    ORDER BY m.sort_order ASC, l.sort_order ASC
  `).bind(user.id, courseId).all();

  if (!lessons || lessons.length === 0) {
    return errorResponse('Course has no lessons yet', 404);
  }

  let targetLessonId = lessons[0].id; // Default to first lesson
  
  // Find first uncompleted
  const uncompleted = lessons.find((l: any) => !l.completed);
  if (uncompleted) {
    targetLessonId = uncompleted.id;
  }

  return new Response(JSON.stringify({
    success: true,
    lessonId: targetLessonId
  }), { status: 200, headers: CORS_HEADERS });
};
