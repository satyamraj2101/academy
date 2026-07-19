import { Env, corsResponse, corsOptionsResponse, verifyAcademyUser } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { db, user } = authResult.context;

  const [me, streak, badges] = await Promise.all([
    db.prepare('SELECT points FROM academy_users WHERE id = ?').bind(user.id).first() as Promise<any>,
    db.prepare('SELECT current_streak, longest_streak FROM academy_streaks WHERE user_id = ?').bind(user.id).first() as Promise<any>,
    db.prepare(`
      SELECT b.slug, b.title, b.description, b.icon, ub.awarded_at
      FROM academy_user_badges ub
      JOIN academy_badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
      ORDER BY ub.awarded_at DESC
    `).bind(user.id).all(),
  ]);

  return corsResponse({
    success: true,
    points: me?.points || 0,
    currentStreak: streak?.current_streak || 0,
    longestStreak: streak?.longest_streak || 0,
    badges: badges.results || [],
  }, 200, request);
};
