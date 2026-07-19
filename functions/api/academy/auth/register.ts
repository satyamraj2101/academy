import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, logAcademyAction, hashIp } from './middleware';
import { hashPassword } from '../../utils/crypto';
import { SignJWT } from 'jose';
import { sendEmail, emailTemplates } from '../../utils/email';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  let result = 'SPOT-';
  for (const byte of array) {
    result += chars[byte % chars.length];
  }
  return result;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (!env.DB || !env.ACADEMY_JWT_SECRET) {
    return errorResponse('Server misconfigured', 503);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const fullName = (body.fullName as string || '').trim();
  const email = (body.email as string || '').toLowerCase().trim();
  const password = body.password as string || '';
  const referralCode = (body.referralCode as string || '').trim();

  if (!fullName || fullName.length < 2) return errorResponse('Full name is required (min 2 chars)', 400);
  if (!email || !email.includes('@')) return errorResponse('Valid email is required', 400);
  
  // Password strength validation: >= 8 chars, 1 uppercase, 1 lowercase, 1 number
  if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return errorResponse('Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number', 400);
  }

  // Check existing email
  const existingUser = await env.DB.prepare('SELECT id FROM academy_users WHERE email = ?').bind(email).first();
  if (existingUser) {
    return errorResponse('This email is already registered', 409);
  }

  // Check referral code
  let referredBy: string | null = null;
  if (referralCode) {
    const referrer = await env.DB.prepare('SELECT referral_code FROM academy_users WHERE referral_code = ?').bind(referralCode).first();
    if (!referrer) {
      return errorResponse('Invalid referral code', 400);
    }
    referredBy = referralCode;
  }

  // Generate unique referral code for new user
  let newReferralCode = '';
  let isUnique = false;
  while (!isUnique) {
    newReferralCode = generateReferralCode();
    const existingCode = await env.DB.prepare('SELECT id FROM academy_users WHERE referral_code = ?').bind(newReferralCode).first();
    if (!existingCode) {
      isUnique = true;
    }
  }

  // Hash password using edge-native PBKDF2
  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Insert user
  const signupIpHash = await hashIp(request.headers.get('CF-Connecting-IP') || '');
  await env.DB.prepare(`
    INSERT INTO academy_users (id, email, password_hash, full_name, referral_code, referred_by, signup_ip_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(userId, email, passwordHash, fullName, newReferralCode, referredBy, signupIpHash || null, now, now).run();

  // Log action
  await logAcademyAction(env.DB, userId, 'user.register', 'user', userId, { source: 'organic' }, request);

  // Generate tokens
  const secret = new TextEncoder().encode(env.ACADEMY_JWT_SECRET);
  const token = await new SignJWT({
    sub: userId,
    email: email,
    role: 'student',
    partner_status: 'none'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);

  const refreshToken = crypto.randomUUID() + crypto.randomUUID(); // Simple secure string
  
  if (env.ENQUIRY_KV) {
    try {
      await env.ENQUIRY_KV.put(`academy:refresh:${refreshToken}`, JSON.stringify({ userId, email, createdAt: now }), { expirationTtl: 60 * 60 * 24 * 30 });
    } catch (e) { console.error('KV error', e); }
  }

  // Send welcome email asynchronously (don't await so we don't block response)
  waitUntil((async () => {
    // 1. Send Welcome Email
    await sendEmail(env, {
      to: email,
      subject: `Welcome to SpotCLM Academy, ${fullName.split(' ')[0]}!`,
      html: emailTemplates.welcome(fullName)
    });

    // 2. Handle Referral Emails
    if (referredBy) {
      // Notify the referrer
      const referrerUser = await env.DB.prepare('SELECT email FROM academy_users WHERE referral_code = ?').bind(referredBy).first();
      if (referrerUser && referrerUser.email) {
        await sendEmail(env, {
          to: referrerUser.email as string,
          subject: 'New Referral! 🎉',
          html: emailTemplates.referralNotification(fullName)
        });
      }
    } else {
      // Promote the referral program to the new user since they didn't use a code
      await sendEmail(env, {
        to: email,
        subject: 'Earn With SpotCLM Academy! 💰',
        html: emailTemplates.referralPromotion(fullName, newReferralCode)
      });
    }
  })().catch(e => console.error('Failed to send emails', e)));

  // Return response with cookies
  const response = new Response(JSON.stringify({
    success: true,
    user: {
      id: userId,
      fullName,
      email,
      role: 'student',
      referralCode: newReferralCode,
      referredBy
    }
  }), { status: 201, headers: CORS_HEADERS });

  // Set cookies
  response.headers.append('Set-Cookie', `academy_token=${token}; HttpOnly; Path=/; SameSite=Strict; Secure; Max-Age=3600`);
  response.headers.append('Set-Cookie', `academy_refresh=${refreshToken}; HttpOnly; Path=/api/academy/auth; SameSite=Strict; Secure; Max-Age=2592000`);

  return response;
};
