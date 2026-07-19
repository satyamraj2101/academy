import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user, db } = authResult.context;

  try {
    const data = await request.json() as { notificationIds?: string[], markAll?: boolean };

    if (data.markAll) {
      await db.prepare('UPDATE academy_notifications SET is_read = 1 WHERE user_id = ?').bind(user.id).run();
    } else if (data.notificationIds && data.notificationIds.length > 0) {
      // Create bind placeholders for IN clause
      const placeholders = data.notificationIds.map(() => '?').join(',');
      await db.prepare(`UPDATE academy_notifications SET is_read = 1 WHERE user_id = ? AND id IN (${placeholders})`)
        .bind(user.id, ...data.notificationIds)
        .run();
    } else {
      return errorResponse('Provide notificationIds or markAll', 400);
    }

    return corsResponse({ success: true });
  } catch (error: any) {
    console.error('Mark read error:', error);
    return errorResponse('Internal server error', 500);
  }
};
