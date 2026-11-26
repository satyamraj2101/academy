import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';
import { reviewState } from './_courseChecklist';

interface Env { DB?: D1Database }

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// GET /lesson-reviews?courseId=<id> -> [{ lesson_id, state: 'none'|'reviewed'|'stale', reviewed_by, reviewed_at, note }]
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyAdminRequest(request, env);
  if ('error' in auth) return auth.error;
  const { admin, db } = auth.context;
  if (!hasPermission(admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  const courseId = new URL(request.url).searchParams.get('courseId');
  if (!courseId) return errorResponse('courseId is required', 400);
  const { results } = await db.prepare(`
    SELECT l.id AS lesson_id, r.reviewed_by, r.reviewed_at, r.note,
      (SELECT MAX(s.created_at) FROM academy_lesson_sections s WHERE s.lesson_id = l.id AND s.section_type != 'interactive_video') AS content_at
    FROM academy_lessons l
    JOIN academy_modules m ON m.id = l.module_id
    LEFT JOIN academy_lesson_reviews r ON r.lesson_id = l.id
    WHERE m.course_id = ?
  `).bind(courseId).all();
  return corsResponse(((results || []) as any[]).map(r => ({
    lesson_id: r.lesson_id, state: reviewState(r.reviewed_at, r.content_at), reviewed_by: r.reviewed_by || null, reviewed_at: r.reviewed_at || null, note: r.note || null,
  })));
};

// POST { lessonId, reviewed: boolean, note? } marks the lesson reviewed by the signed-in admin, or clears the mark.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyAdminRequest(request, env);
  if ('error' in auth) return auth.error;
  const { admin, db } = auth.context;
  if (!hasPermission(admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  let body: any;
  try { body = await request.json(); } catch { return errorResponse('Invalid JSON body', 400); }
  const lessonId = typeof body?.lessonId === 'string' ? body.lessonId : '';
  if (!lessonId) return errorResponse('lessonId is required', 400);
  const lesson = await db.prepare('SELECT id FROM academy_lessons WHERE id = ?').bind(lessonId).first();
  if (!lesson) return errorResponse('Lesson not found', 404);

  if (body.reviewed === false) {
    await db.prepare('DELETE FROM academy_lesson_reviews WHERE lesson_id = ?').bind(lessonId).run();
    await logAdminAction(db, admin.email, 'academy.lesson.review_clear', 'lesson', lessonId, {}, request);
    return corsResponse({ success: true, state: 'none' });
  }
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 500) || null : null;
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO academy_lesson_reviews (lesson_id, reviewed_by, reviewed_at, note) VALUES (?, ?, ?, ?)
    ON CONFLICT(lesson_id) DO UPDATE SET reviewed_by = excluded.reviewed_by, reviewed_at = excluded.reviewed_at, note = excluded.note
  `).bind(lessonId, admin.email, now, note).run();
  await logAdminAction(db, admin.email, 'academy.lesson.review', 'lesson', lessonId, {}, request);
  return corsResponse({ success: true, state: 'reviewed', reviewed_by: admin.email, reviewed_at: now });
};
