import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user, db } = authResult.context;

  try {
    const { results } = await db.prepare(`
      SELECT * FROM academy_notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `).bind(user.id).all();

    const unreadCount = await db.prepare(`
      SELECT COUNT(*) as count FROM academy_notifications 
      WHERE user_id = ? AND is_read = 0
    `).bind(user.id).first('count') as number;

    return corsResponse({
      success: true,
      notifications: results,
      unreadCount
    });
  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    return errorResponse('Internal server error', 500);
  }
};
