import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';
import { getUnmetPrerequisites } from '../_prerequisites';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, params, env }) => {
  if (!env.DB) return errorResponse('Database not configured', 503);
  
  const id = params.id as string;
  if (!id) return errorResponse('Course ID is required', 400);

  // Fetch course
  const course = await env.DB.prepare(`
    SELECT c.*, u.full_name as instructor_name, u.bio as instructor_bio, u.avatar_url as instructor_avatar
    FROM academy_courses c
    LEFT JOIN academy_users u ON c.instructor_id = u.id
    WHERE c.id = ? AND (c.status = 'published' OR c.is_published = 1)
  `).bind(id).first() as any;

  if (!course) {
    return errorResponse('Course not found', 404);
  }

  course.platforms = course.platforms ? JSON.parse(course.platforms) : [];

  const reviewStats = await env.DB.prepare('SELECT COUNT(*) as count FROM academy_course_reviews WHERE course_id = ?').bind(id).first() as any;
  course.review_count = reviewStats?.count || 0;

  // Fetch modules
  const { results: modules } = await env.DB.prepare(`
    SELECT id, title, description, sort_order, drip_days, unlock_date
    FROM academy_modules
    WHERE course_id = ? AND is_published = 1
    ORDER BY sort_order ASC
  `).bind(id).all();

  // Fetch lessons metadata (no content)
  const { results: lessons } = await env.DB.prepare(`
    SELECT id, module_id, title, content_type, video_duration_minutes, sort_order, is_preview, drip_days, unlock_date
    FROM academy_lessons
    WHERE module_id IN (SELECT id FROM academy_modules WHERE course_id = ?) AND is_published = 1
    ORDER BY sort_order ASC
  `).bind(id).all();

  // Fetch optional user progress
  let completedLessonIds = new Set<string>();
  let unmetPrerequisites: any[] = [];
  const authResult = await verifyAcademyUser(request, env).catch(() => null);
  if (authResult && !('error' in authResult)) {
    const { user } = authResult.context;
    const { results: progress } = await env.DB.prepare(`
      SELECT lesson_id FROM academy_lesson_progress
      WHERE user_id = ? AND completed = 1
    `).bind(user.id).all();
    if (progress) {
      completedLessonIds = new Set(progress.map((p: any) => p.lesson_id));
    }
    unmetPrerequisites = await getUnmetPrerequisites(env.DB, user.id, id);
  }

  const { results: allPrereqs } = await env.DB.prepare(`
    SELECT p.prerequisite_course_id as courseId, pc.title, p.enforcement
    FROM academy_course_prerequisites p
    JOIN academy_courses pc ON p.prerequisite_course_id = pc.id
    WHERE p.course_id = ?
  `).bind(id).all();

  // Group lessons by module
  const fullModules = modules.map((m: any) => ({
    ...m,
    lessons: lessons.filter((l: any) => l.module_id === m.id).map((l: any) => ({
      ...l,
      completed: completedLessonIds.has(l.id)
    }))
  }));

  return new Response(JSON.stringify({
    success: true,
    course,
    modules: fullModules,
    prerequisites: allPrereqs || [],
    unmetPrerequisites,
  }), { status: 200, headers: CORS_HEADERS });
};
