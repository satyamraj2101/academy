import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, logAcademyAction } from './middleware';
import { jwtVerify, SignJWT } from 'jose';
import { verifyTOTP } from '../../utils/totp';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB || !env.ACADEMY_JWT_SECRET) return errorResponse('Server misconfigured', 503);

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const tokenStr = body.token as string;
  const code = body.code as string;

  if (!tokenStr || !code) return errorResponse('Token and code required', 400);

  const secret = new TextEncoder().encode(env.ACADEMY_JWT_SECRET);
  let payload;
  try {
    const verified = await jwtVerify(tokenStr, secret);
    payload = verified.payload;
  } catch (err) {
    return errorResponse('Invalid or expired token', 401);
  }

  if (!payload.requires2FA || !payload.sub) {
    return errorResponse('Invalid token type', 401);
  }

  const userId = payload.sub as string;
  const user = await env.DB.prepare('SELECT * FROM academy_users WHERE id = ?').bind(userId).first() as any;

  if (!user || user.totp_enabled !== 1 || !user.totp_secret) {
    return errorResponse('2FA not properly configured', 400);
  }

  const isValid = await verifyTOTP(user.totp_secret, code);
  
  if (!isValid) {
    await logAcademyAction(env.DB, user.id, 'user.login.2fa_failed', 'user', user.id, {}, request);
    return errorResponse('Invalid 2FA code', 401);
  }

  // Generate real tokens
  const realToken = await new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    partner_status: user.partner_status
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);

  const refreshToken = crypto.randomUUID() + crypto.randomUUID();
  const now = new Date().toISOString();
  
  if (env.ENQUIRY_KV) {
    try {
      await env.ENQUIRY_KV.put(`academy:refresh:${refreshToken}`, JSON.stringify({ userId: user.id, email: user.email, createdAt: now }), { expirationTtl: 60 * 60 * 24 * 30 });
    } catch (e) { console.error('KV error', e); }
  }

  await logAcademyAction(env.DB, user.id, 'user.login.2fa_success', 'user', user.id, {}, request);

  const response = new Response(JSON.stringify({
    success: true,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      partnerStatus: user.partner_status,
      creditBalance: user.credit_balance,
      avatarUrl: user.avatar_url
    }
  }), { status: 200, headers: CORS_HEADERS });

  response.headers.append('Set-Cookie', `academy_token=${realToken}; HttpOnly; Path=/; SameSite=Strict; Secure; Max-Age=3600`);
  response.headers.append('Set-Cookie', `academy_refresh=${refreshToken}; HttpOnly; Path=/api/academy/auth; SameSite=Strict; Secure; Max-Age=2592000`);

  return response;
};
