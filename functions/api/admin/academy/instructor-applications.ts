import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';

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
  const { context } = result;
  if (!hasPermission(context.admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  const { db } = context;
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'pending';

  const { results } = await db.prepare(`
    SELECT u.id, u.full_name, u.email, u.instructor_status, u.instructor_applied_at, u.instructor_bio,
      (SELECT COUNT(*) FROM academy_courses c WHERE c.instructor_id = u.id) as course_count,
      (SELECT COUNT(*) FROM academy_enrollments e JOIN academy_courses c ON e.course_id = c.id WHERE c.instructor_id = u.id AND e.status = 'active') as total_enrollments
    FROM academy_users u WHERE u.instructor_status = ? ORDER BY u.instructor_applied_at DESC
  `).bind(status).all();

  return corsResponse({ success: true, applications: results });
};

// Approve or reject a pending instructor application.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;
  if (!hasPermission(context.admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  const { db, admin } = context;

  try {
    const data = await request.json() as any;
    const { user_id, action } = data; // action: 'approve' | 'reject' | 'revoke'
    if (!user_id || !['approve', 'reject', 'revoke'].includes(action)) return errorResponse('Missing or invalid fields', 400);

    if (action === 'approve') {
      await db.prepare(`UPDATE academy_users SET instructor_status = 'approved', role = 'instructor' WHERE id = ?`).bind(user_id).run();
    } else if (action === 'reject') {
      await db.prepare(`UPDATE academy_users SET instructor_status = 'rejected' WHERE id = ?`).bind(user_id).run();
    } else {
      // Revoke a previously-approved instructor — their courses stay intact
      // and attributed to them, they simply lose instructor-area access.
      await db.prepare(`UPDATE academy_users SET instructor_status = 'revoked', role = 'student' WHERE id = ?`).bind(user_id).run();
    }

    await logAdminAction(db, admin.email, `academy.instructor.${action}`, 'user', user_id, {}, request);

    return corsResponse({ success: true });
  } catch (err: any) {
    return errorResponse('Failed to process application', 500);
  }
};
