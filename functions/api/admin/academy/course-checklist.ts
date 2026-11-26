import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';
import { buildChecklist, reviewState, type ModuleFacts } from './_courseChecklist';

interface Env { DB?: D1Database }

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// GET /course-checklist?courseId=<id> -> { items: [...], canPublish }
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyAdminRequest(request, env);
  if ('error' in auth) return auth.error;
  const { admin, db } = auth.context;
  if (!hasPermission(admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  const courseId = new URL(request.url).searchParams.get('courseId');
  if (!courseId) return errorResponse('courseId is required', 400);
  const course = await db.prepare('SELECT title, description, thumbnail_url, banner_url, has_certification, price_usd, price_inr FROM academy_courses WHERE id = ?').bind(courseId).first() as any;
  if (!course) return errorResponse('Course not found', 404);

  const { results: lessonRows } = await db.prepare(`
    SELECT m.id AS module_id, m.title AS module_title, m.sort_order AS m_order, l.id AS lesson_id, l.title AS lesson_title, l.sort_order AS l_order,
      COALESCE(LENGTH(l.content_body), 0) AS body_chars,
      (SELECT COALESCE(SUM(LENGTH(s.content)), 0) FROM academy_lesson_sections s WHERE s.lesson_id = l.id AND s.section_type = 'markdown') AS text_chars,
      (SELECT COUNT(*) FROM academy_lesson_sections s WHERE s.lesson_id = l.id AND s.section_type = 'interactive_video') AS videos,
      (SELECT COUNT(*) FROM academy_lesson_sections s WHERE s.lesson_id = l.id AND s.section_type = 'quiz') AS quizzes,
      (SELECT MAX(s.created_at) FROM academy_lesson_sections s WHERE s.lesson_id = l.id AND s.section_type != 'interactive_video') AS content_at,
      r.reviewed_at
    FROM academy_modules m
    JOIN academy_lessons l ON l.module_id = m.id
    LEFT JOIN academy_lesson_reviews r ON r.lesson_id = l.id
    WHERE m.course_id = ? ORDER BY m.sort_order, l.sort_order
  `).bind(courseId).all();

  const mods = new Map<string, ModuleFacts>();
  for (const r of (lessonRows || []) as any[]) {
    if (!mods.has(r.module_id)) mods.set(r.module_id, { id: r.module_id, title: r.module_title, hasQuiz: false, lessons: [] });
    const m = mods.get(r.module_id)!;
    if (r.quizzes > 0) m.hasQuiz = true;
    m.lessons.push({ id: r.lesson_id, title: r.lesson_title, textChars: Math.max(Number(r.text_chars) || 0, Number(r.body_chars) || 0), hasVideo: r.videos > 0, review: reviewState(r.reviewed_at, r.content_at) });
  }
  // A module with no lessons still counts as a module.
  const { results: emptyMods } = await db.prepare('SELECT id, title FROM academy_modules WHERE course_id = ?').bind(courseId).all();
  for (const m of (emptyMods || []) as any[]) if (!mods.has(m.id)) mods.set(m.id, { id: m.id, title: m.title, hasQuiz: false, lessons: [] });

  return corsResponse(buildChecklist({
    title: course.title, description: course.description, thumbnailUrl: course.thumbnail_url, bannerUrl: course.banner_url,
    hasCertification: !!course.has_certification, priceUsd: Number(course.price_usd) || 0, priceInr: Number(course.price_inr) || 0,
    modules: [...mods.values()],
  }));
};

// POST { courseId, unmet: string[] } records that someone published although some checklist items were open.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyAdminRequest(request, env);
  if ('error' in auth) return auth.error;
  const { admin, db } = auth.context;
  if (!hasPermission(admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);
  let body: any;
  try { body = await request.json(); } catch { return errorResponse('Invalid JSON body', 400); }
  const courseId = typeof body?.courseId === 'string' ? body.courseId : '';
  if (!courseId) return errorResponse('courseId is required', 400);
  const unmet = (Array.isArray(body?.unmet) ? body.unmet : []).filter((x: unknown) => typeof x === 'string').slice(0, 12);
  await logAdminAction(db, admin.email, 'academy.course.publish_override', 'course', courseId, { unmet }, request);
  return corsResponse({ success: true });
};
