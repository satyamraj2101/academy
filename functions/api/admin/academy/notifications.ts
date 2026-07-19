import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';

interface Env {
  DB?: D1Database;
  ADMIN_JWT_AUDIENCE?: string;
  ENV?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// Lets an admin broadcast a notification to all active students, everyone
// enrolled in a specific course, or one specific student — and separately,
// nudge every student currently mid-course (progress between 1% and 99%)
// with a reminder to keep going. Both write directly into the same
// academy_notifications table students already read from via the bell icon.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;

  if (!hasPermission(context.admin, 'academy')) {
    return errorResponse('Forbidden — insufficient permissions', 403);
  }

  const { db, admin } = context;

  let data: any;
  try {
    data = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  try {
    if (data.type === 'reminders') {
      const { results: inProgress } = await db.prepare(`
        SELECT e.user_id, e.progress_percent, c.title AS course_title, c.id AS course_id
        FROM academy_enrollments e
        JOIN academy_courses c ON e.course_id = c.id
        WHERE e.progress_percent > 0 AND e.progress_percent < 100
      `).all();

      const rows = (inProgress || []) as any[];
      const now = new Date().toISOString();
      for (const row of rows) {
        await db.prepare(`
          INSERT INTO academy_notifications (id, user_id, title, message, action_url, is_read, created_at)
          VALUES (?, ?, ?, ?, ?, 0, ?)
        `).bind(
          crypto.randomUUID(),
          row.user_id,
          'Keep your momentum going',
          `You're ${row.progress_percent}% through "${row.course_title}" — pick up where you left off.`,
          `/course-player/${row.course_id}`,
          now
        ).run();
      }

      await logAdminAction(db, admin.email, 'academy.notifications.reminders', 'notification', 'reminders', { count: rows.length }, request);
      return corsResponse({ success: true, sent: rows.length });
    }

    const { audience, courseId, userId, title, message, action_url } = data;
    if (!title?.trim() || !message?.trim()) {
      return errorResponse('title and message are required', 400);
    }
    if (!['all', 'course', 'user'].includes(audience)) {
      return errorResponse('audience must be all, course, or user', 400);
    }

    let targetUserIds: string[] = [];
    if (audience === 'all') {
      const { results } = await db.prepare('SELECT id FROM academy_users WHERE is_active = 1').all();
      targetUserIds = (results || []).map((r: any) => r.id);
    } else if (audience === 'course') {
      if (!courseId) return errorResponse('courseId is required for course audience', 400);
      const { results } = await db.prepare('SELECT user_id FROM academy_enrollments WHERE course_id = ?').bind(courseId).all();
      targetUserIds = (results || []).map((r: any) => r.user_id);
    } else {
      if (!userId) return errorResponse('userId is required for user audience', 400);
      targetUserIds = [userId];
    }

    const now = new Date().toISOString();
    for (const uid of targetUserIds) {
      await db.prepare(`
        INSERT INTO academy_notifications (id, user_id, title, message, action_url, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?)
      `).bind(crypto.randomUUID(), uid, title.trim(), message.trim(), action_url || null, now).run();
    }

    await logAdminAction(db, admin.email, 'academy.notifications.send', 'notification', audience, { audience, courseId, userId, title, recipientCount: targetUserIds.length }, request);

    return corsResponse({ success: true, sent: targetUserIds.length });
  } catch (err: any) {
    console.error('Admin notifications error:', err);
    return errorResponse('Failed to send notification', 500);
  }
};
