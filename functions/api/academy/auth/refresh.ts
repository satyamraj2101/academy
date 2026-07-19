import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, getCookie } from './middleware';
import { SignJWT } from 'jose';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB || !env.ACADEMY_JWT_SECRET) {
    return errorResponse('Server misconfigured', 503);
  }

  const oldRefreshToken = getCookie(request, 'academy_refresh');
  if (!oldRefreshToken) {
    return errorResponse('No refresh token provided', 401);
  }

  if (!env.ENQUIRY_KV) {
    return errorResponse('KV not configured', 503);
  }

  const sessionStr = await env.ENQUIRY_KV.get(`academy:refresh:${oldRefreshToken}`);
  if (!sessionStr) {
    return errorResponse('Invalid or expired refresh token', 401);
  }

  let session: { userId: string; email: string };
  try {
    session = JSON.parse(sessionStr);
  } catch {
    return errorResponse('Invalid session data', 401);
  }

  const user = await env.DB.prepare('SELECT id, email, full_name, role, partner_status, credit_balance, referral_code, avatar_url FROM academy_users WHERE id = ? AND is_active = 1').bind(session.userId).first() as any;

  if (!user) {
    return errorResponse('User not found or inactive', 401);
  }

  // Generate new tokens
  const secret = new TextEncoder().encode(env.ACADEMY_JWT_SECRET);
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    partner_status: user.partner_status
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);

  const newRefreshToken = crypto.randomUUID() + crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Replace old token with new one
  try {
    await env.ENQUIRY_KV.delete(`academy:refresh:${oldRefreshToken}`);
    await env.ENQUIRY_KV.put(`academy:refresh:${newRefreshToken}`, JSON.stringify({ userId: user.id, email: user.email, createdAt: now }), { expirationTtl: 60 * 60 * 24 * 30 });
  } catch (e) { console.error('KV error', e); }

  const response = new Response(JSON.stringify({
    success: true,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      partnerStatus: user.partner_status,
      creditBalance: user.credit_balance,
      referralCode: user.referral_code,
      avatarUrl: user.avatar_url
    }
  }), { status: 200, headers: CORS_HEADERS });

  // Set cookies
  response.headers.append('Set-Cookie', `academy_token=${token}; HttpOnly; Path=/; SameSite=Strict; Secure; Max-Age=3600`);
  response.headers.append('Set-Cookie', `academy_refresh=${newRefreshToken}; HttpOnly; Path=/api/academy/auth; SameSite=Strict; Secure; Max-Age=2592000`);

  return response;
};
