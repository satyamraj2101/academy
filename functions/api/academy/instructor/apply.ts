import { Env, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// A student applies to become an instructor. Mirrors the existing partner
// application pattern — sets a pending status for an admin to review, does
// NOT grant any instructor access until approved.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;

  const existing = await db.prepare('SELECT instructor_status FROM academy_users WHERE id = ?').bind(user.id).first() as any;
  if (existing?.instructor_status === 'pending') return errorResponse('Application already pending review', 409, request);
  if (existing?.instructor_status === 'approved') return errorResponse('You are already an approved instructor', 409, request);

  let body: { bio?: string } = {};
  try { body = await request.json(); } catch { /* bio is optional */ }

  await db.prepare(`
    UPDATE academy_users SET instructor_status = 'pending', instructor_applied_at = ?, instructor_bio = ? WHERE id = ?
  `).bind(new Date().toISOString(), body.bio || null, user.id).run();

  return corsResponse({ success: true }, 200, request);
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;

  const row = await db.prepare('SELECT instructor_status, instructor_applied_at, instructor_bio FROM academy_users WHERE id = ?').bind(user.id).first();
  return corsResponse({ success: true, ...row }, 200, request);
};
