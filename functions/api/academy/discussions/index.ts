import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { db, user } = authResult.context;

  const url = new URL(request.url);
  const lessonId = url.searchParams.get('lessonId');
  if (!lessonId) return errorResponse('lessonId is required', 400, request);

  const { results } = await db.prepare(`
    SELECT d.id, d.parent_id, d.message, d.created_at, d.user_id, d.upvote_count, d.is_best_answer,
           u.full_name as user_name, u.avatar_url as user_avatar, u.role as user_role,
           EXISTS(SELECT 1 FROM academy_discussion_upvotes v WHERE v.discussion_id = d.id AND v.user_id = ?) as upvoted_by_me
    FROM academy_discussions d
    JOIN academy_users u ON d.user_id = u.id
    WHERE d.lesson_id = ?
    ORDER BY d.created_at ASC
  `).bind(user.id, lessonId).all();

  return corsResponse({ success: true, discussions: results }, 200, request);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;

  let body: { lessonId: string; message: string; parentId?: string };
  try {
    body = await request.json() as { lessonId: string; message: string; parentId?: string };
  } catch {
    return errorResponse('Invalid JSON body', 400, request);
  }

  if (!body.lessonId || !body.message?.trim()) return errorResponse('lessonId and message are required', 400, request);

  const lesson = await db.prepare(`
    SELECT l.id, m.course_id FROM academy_lessons l JOIN academy_modules m ON l.module_id = m.id WHERE l.id = ?
  `).bind(body.lessonId).first() as any;
  if (!lesson) return errorResponse('Lesson not found', 404, request);

  const enrollment = await db.prepare('SELECT id FROM academy_enrollments WHERE user_id = ? AND course_id = ? AND status = "active"')
    .bind(user.id, lesson.course_id).first();
  if (!enrollment) return errorResponse('Not enrolled in this course', 403, request);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO academy_discussions (id, course_id, lesson_id, user_id, parent_id, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, lesson.course_id, body.lessonId, user.id, body.parentId || null, body.message.trim(), now).run();

  // Notify the person being replied to — never yourself, and only on actual replies.
  if (body.parentId) {
    const parent = await db.prepare('SELECT user_id FROM academy_discussions WHERE id = ?').bind(body.parentId).first() as any;
    if (parent && parent.user_id !== user.id) {
      const [replier, lessonMeta] = await Promise.all([
        db.prepare('SELECT full_name FROM academy_users WHERE id = ?').bind(user.id).first() as Promise<any>,
        db.prepare('SELECT title FROM academy_lessons WHERE id = ?').bind(body.lessonId).first() as Promise<any>,
      ]);
      await db.prepare(`
        INSERT INTO academy_notifications (id, user_id, title, message, action_url, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?)
      `).bind(
        crypto.randomUUID(),
        parent.user_id,
        'New reply to your question',
        `${replier?.full_name || 'Someone'} replied in "${lessonMeta?.title || 'a lesson'}".`,
        `/course-player/${lesson.course_id}/lesson/${body.lessonId}`,
        now
      ).run();
    }
  }

  return corsResponse({ success: true, id }, 200, request);
};
