import { Env, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;

  const { results } = await db.prepare(`
    SELECT c.credential_id, c.issued_at, crs.id as course_id, crs.title as course_title, crs.thumbnail_url
    FROM academy_user_certificates c
    JOIN academy_courses crs ON c.course_id = crs.id
    WHERE c.user_id = ?
    ORDER BY c.issued_at DESC
  `).bind(user.id).all();

  return corsResponse({ success: true, certificates: results }, 200, request);
};
