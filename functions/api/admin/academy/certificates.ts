import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse } from '../middleware';

interface Env {
  DB?: D1Database;
  ADMIN_JWT_AUDIENCE?: string;
  ENV?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { db } = result.context;

  const { results } = await db.prepare(`
    SELECT c.credential_id, c.issued_at, u.email as user_email, u.full_name as user_name, crs.title as course_title
    FROM academy_user_certificates c
    JOIN academy_users u ON c.user_id = u.id
    JOIN academy_courses crs ON c.course_id = crs.id
    ORDER BY c.issued_at DESC
  `).all();

  const certificates = results.map((r: any) => ({
    id: r.credential_id,
    student: r.user_name,
    course: r.course_title,
    dateIssued: r.issued_at,
  }));

  return corsResponse({ certificates });
};
