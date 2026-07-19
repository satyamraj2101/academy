import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, logAcademyAction } from './middleware';
import { hashPassword } from '../../utils/crypto';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB || !env.ENQUIRY_KV) {
    return errorResponse('Server misconfigured', 503);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const token = (body.token as string || '').trim();
  const password = body.password as string || '';

  if (!token) return errorResponse('Token is required', 400);
  if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return errorResponse('Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number', 400);
  }

  const email = await env.ENQUIRY_KV.get(`academy:reset:${token}`);
  if (!email) {
    return errorResponse('Invalid or expired reset token', 400);
  }

  const user = await env.DB.prepare('SELECT id FROM academy_users WHERE email = ?').bind(email).first();
  if (!user) {
    return errorResponse('User not found', 404);
  }

  const passwordHash = await hashPassword(password);

  await env.DB.prepare('UPDATE academy_users SET password_hash = ?, updated_at = ? WHERE email = ?')
    .bind(passwordHash, new Date().toISOString(), email)
    .run();

  await env.ENQUIRY_KV.delete(`academy:reset:${token}`);

  await logAcademyAction(env.DB, user.id as string, 'user.reset_password', 'user', user.id as string, {}, request);

  return new Response(JSON.stringify({ success: true, message: 'Password updated successfully' }), { status: 200, headers: CORS_HEADERS });
};
