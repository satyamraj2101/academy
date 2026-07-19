import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, logAcademyAction } from './middleware';
import { verifyPassword } from '../../utils/crypto';
import { SignJWT } from 'jose';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB || !env.ACADEMY_JWT_SECRET) {
    return errorResponse('Server misconfigured', 503);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const email = (body.email as string || '').toLowerCase().trim();
  const password = body.password as string || '';

  if (!email || !password) {
    return errorResponse('Email and password are required', 400);
  }

  // Check lockout in KV
  if (env.ENQUIRY_KV) {
    const lockedOut = await env.ENQUIRY_KV.get(`academy:lockout:${email}`);
    if (lockedOut) {
      return errorResponse('Account is temporarily locked. Please try again later.', 403);
    }
  }

  // Get user
  const user = await env.DB.prepare('SELECT * FROM academy_users WHERE email = ?').bind(email).first() as any;

  if (!user || user.is_active !== 1) {
    await handleFailedLogin(email, env);
    return errorResponse('Invalid credentials', 401);
  }

  // Verify password using edge-native PBKDF2
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    await handleFailedLogin(email, env);
    return errorResponse('Invalid credentials', 401);
  }

  // Reset login attempts
  await env.DB.prepare('UPDATE academy_users SET login_attempts = 0 WHERE email = ?').bind(email).run();

  // Log action
  await logAcademyAction(env.DB, user.id, 'user.login', 'user', user.id, {}, request);

  // Generate tokens
  const secret = new TextEncoder().encode(env.ACADEMY_JWT_SECRET);
  if (user.totp_enabled === 1) {
    // Return a temporary 2FA token instead of full access
    const tempToken = await new SignJWT({ sub: user.id, requires2FA: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(secret);
      
    return new Response(JSON.stringify({
      success: true,
      requires2FA: true,
      tempToken
    }), { status: 200, headers: CORS_HEADERS });
  }

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

  const refreshToken = crypto.randomUUID() + crypto.randomUUID();
  const now = new Date().toISOString();
  
  if (env.ENQUIRY_KV) {
    try {
      await env.ENQUIRY_KV.put(`academy:refresh:${refreshToken}`, JSON.stringify({ userId: user.id, email: user.email, createdAt: now }), { expirationTtl: 60 * 60 * 24 * 30 });
    } catch(e) { console.error('KV error', e); }
  }

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
  response.headers.append('Set-Cookie', `academy_refresh=${refreshToken}; HttpOnly; Path=/api/academy/auth; SameSite=Strict; Secure; Max-Age=2592000`);

  return response;
};

async function handleFailedLogin(email: string, env: Env) {
  if (!env.DB) return;
  
  // Increment attempts
  await env.DB.prepare('UPDATE academy_users SET login_attempts = login_attempts + 1 WHERE email = ?').bind(email).run();
  
  // Check if we need to lock out
  const user = await env.DB.prepare('SELECT login_attempts FROM academy_users WHERE email = ?').bind(email).first();
  if (user && (user.login_attempts as number) >= 5) {
    if (env.ENQUIRY_KV) {
      try {
        await env.ENQUIRY_KV.put(`academy:lockout:${email}`, '1', { expirationTtl: 900 }); // 15 mins
      } catch(e) { console.error('KV error', e); }
    }
    // Reset attempts after locking
    await env.DB.prepare('UPDATE academy_users SET login_attempts = 0 WHERE email = ?').bind(email).run();
  }
}
