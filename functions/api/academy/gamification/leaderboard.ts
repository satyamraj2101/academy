import { Env, corsResponse, corsOptionsResponse, verifyAcademyUser } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { db, user } = authResult.context;

  const { results: top } = await db.prepare(`
    SELECT id, full_name, avatar_url, points
    FROM academy_users
    WHERE points > 0
    ORDER BY points DESC
    LIMIT 20
  `).all();

  const me = await db.prepare('SELECT points FROM academy_users WHERE id = ?').bind(user.id).first() as any;
  const rankRow = await db.prepare('SELECT COUNT(*) as rank FROM academy_users WHERE points > ?').bind(me?.points || 0).first() as any;

  return corsResponse({ success: true, leaderboard: top, myPoints: me?.points || 0, myRank: (rankRow?.rank || 0) + 1 }, 200, request);
};
