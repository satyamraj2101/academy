import { Env, CORS_HEADERS, corsOptionsResponse, errorResponse, verifyAcademyUser, logAcademyAction } from './middleware';
import { verifyPassword, hashPassword } from '../../utils/crypto';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user, db } = authResult.context;

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const currentPassword = body.currentPassword as string || '';
  const newPassword = body.newPassword as string || '';

  if (!currentPassword) return errorResponse('Current password is required', 400);
  if (!newPassword || newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return errorResponse('New password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number', 400);
  }

  const row = await db.prepare('SELECT password_hash FROM academy_users WHERE id = ?').bind(user.id).first() as { password_hash: string } | null;
  if (!row) return errorResponse('User not found', 404);

  const isValid = await verifyPassword(currentPassword, row.password_hash);
  if (!isValid) return errorResponse('Current password is incorrect', 401);

  const newHash = await hashPassword(newPassword);
  await db.prepare('UPDATE academy_users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(newHash, new Date().toISOString(), user.id)
    .run();

  await logAcademyAction(db, user.id, 'user.change_password', 'user', user.id, {}, request);

  return new Response(JSON.stringify({ success: true, message: 'Password updated successfully' }), { status: 200, headers: CORS_HEADERS });
};
