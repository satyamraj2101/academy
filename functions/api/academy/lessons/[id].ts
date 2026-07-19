import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user, db } = authResult.context;
  const lessonId = params.id as string;

  if (!lessonId) return errorResponse('Lesson ID required', 400);

  // Fetch lesson and verify enrollment
  const lesson = await db.prepare(`
    SELECT l.id, l.module_id, l.title, l.content_type, l.content_body, l.video_url, l.pdf_url, l.is_preview,
           l.drip_days AS lesson_drip_days, l.unlock_date AS lesson_unlock_date,
           m.course_id, m.drip_days AS module_drip_days, m.unlock_date AS module_unlock_date
    FROM academy_lessons l
    JOIN academy_modules m ON l.module_id = m.id
    WHERE l.id = ? AND l.is_published = 1
  `).bind(lessonId).first() as any;

  if (!lesson) {
    return errorResponse('Lesson not found', 404);
  }

  // Check enrollment unless it's a preview lesson
  let enrollment: any = null;
  if (!lesson.is_preview) {
    enrollment = await db.prepare('SELECT id, enrolled_at FROM academy_enrollments WHERE user_id = ? AND course_id = ? AND status = "active"')
      .bind(user.id, lesson.course_id).first();

    if (!enrollment) {
      return errorResponse('Not enrolled in this course', 403);
    }

    // Drip scheduling: a lesson/module can be gated behind a fixed unlock date
    // or a delay in days from enrollment — the later of module- and
    // lesson-level rules applies since a lesson can't unlock before its module.
    const unlockDates = [lesson.module_unlock_date, lesson.lesson_unlock_date].filter(Boolean);
    if (unlockDates.some((d: string) => new Date(d) > new Date())) {
      return errorResponse('This lesson is not yet available', 403);
    }
    const dripDays = Math.max(lesson.module_drip_days || 0, lesson.lesson_drip_days || 0);
    if (dripDays > 0) {
      const unlockAt = new Date(enrollment.enrolled_at);
      unlockAt.setDate(unlockAt.getDate() + dripDays);
      if (unlockAt > new Date()) {
        return errorResponse('This lesson is not yet available', 403);
      }
    }
  }

  // Check if completed
  const progress = await db.prepare('SELECT completed FROM academy_lesson_progress WHERE user_id = ? AND lesson_id = ?')
    .bind(user.id, lesson.id).first() as any;

  // Fetch modular content blocks (markdown, video, image, ppt, quiz, assignment)
  const { results: sections } = await db.prepare(`
    SELECT id, section_type, sort_order, content, is_mandatory
    FROM academy_lesson_sections
    WHERE lesson_id = ?
    ORDER BY sort_order ASC
  `).bind(lessonId).all();

  return new Response(JSON.stringify({
    success: true,
    lesson: {
      ...lesson,
      completed: progress ? !!progress.completed : false,
      sections: sections || []
    }
  }), { status: 200, headers: CORS_HEADERS });
};
