import { jwtVerify, SignJWT } from 'jose';

export interface Env {
  DB?: D1Database;
  ACADEMY_JWT_SECRET?: string;
  ENQUIRY_KV?: KVNamespace;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  RESEND_TO_EMAIL?: string;
  CERTIFICATE_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  RAZORPAY_WEBHOOK_SECRET?: string;
  GEMINI_API_KEY?: string;
}

export interface AcademyUser {
  id: string;
  email: string;
  role: string;
  partnerStatus: string;
}

export interface AcademyContext {
  user: AcademyUser;
  db: D1Database;
}

const ALLOWED_ORIGIN = 'https://spotclm-academy.pages.dev';

export function getCorsHeaders(request?: Request): Record<string, string> {
  const origin = request?.headers.get('Origin') || '';
  // Allow the prod origin and localhost for dev
  const allowedOrigin =
    origin === ALLOWED_ORIGIN ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1')
      ? origin
      : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
}

// Keep backward compat export for handlers that don't pass request
export const CORS_HEADERS = getCorsHeaders();

export const corsResponse = (body: unknown, status = 200, request?: Request) =>
  new Response(JSON.stringify(body), { status, headers: getCorsHeaders(request) });

export const corsOptionsResponse = (request?: Request) =>
  new Response(null, { status: 204, headers: getCorsHeaders(request) });

export const errorResponse = (message: string, status = 400, request?: Request) =>
  new Response(JSON.stringify({ error: message }), { status, headers: getCorsHeaders(request) });

// Helper to extract cookies from header
export function getCookie(request: Request, name: string): string | null {
  const cookieString = request.headers.get('Cookie');
  if (!cookieString) return null;
  const match = cookieString.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return decodeURIComponent(match[2]);
  return null;
}

export async function verifyAcademyUser(
  request: Request,
  env: Env
): Promise<{ context: AcademyContext } | { error: Response }> {
  // Global Rate Limiting
  if (env.ENQUIRY_KV) {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const limitKey = `academy:rl:${ip}`;
    
    // Simple token bucket: 100 requests per minute
    const currentStr = await env.ENQUIRY_KV.get(limitKey);
    const current = currentStr ? parseInt(currentStr, 10) : 0;
    
    if (current > 100) {
      return { error: errorResponse('Too many requests, please try again later.', 429) };
    }
    try {
      await env.ENQUIRY_KV.put(limitKey, (current + 1).toString(), { expirationTtl: 60 });
    } catch (e) { console.error('KV error', e); }
  }

  if (!env.DB) {
    return { error: errorResponse('Database not configured', 503) };
  }

  const token = getCookie(request, 'academy_token');
  if (!token) {
    // Fallback to Bearer token for API clients if needed
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { error: errorResponse('Unauthorized — missing token', 401) };
    }
  }

  const jwtToken = token || request.headers.get('Authorization')?.slice(7);
  if (!jwtToken) {
    return { error: errorResponse('Unauthorized — missing token', 401) };
  }

  if (!env.ACADEMY_JWT_SECRET) {
    return { error: errorResponse('Server misconfigured — auth unavailable', 503) };
  }

  try {
    const secret = new TextEncoder().encode(env.ACADEMY_JWT_SECRET);
    const { payload } = await jwtVerify(jwtToken, secret);

    return {
      context: {
        user: {
          id: payload.sub as string,
          email: payload.email as string,
          role: payload.role as string,
          partnerStatus: payload.partner_status as string,
        },
        db: env.DB,
      },
    };
  } catch (e) {
    return { error: errorResponse('Unauthorized — invalid or expired token', 401) };
  }
}

export function requireRole(allowedRoles: string[]) {
  return async (request: Request, env: Env, next: () => Promise<Response>) => {
    const authResult = await verifyAcademyUser(request, env);
    if ('error' in authResult) return authResult.error;

    const { user } = authResult.context;
    if (!allowedRoles.includes(user.role)) {
      return errorResponse('Forbidden — insufficient permissions', 403);
    }

    // Attach user to request for downstream handlers if possible, or just pass it via some context object in actual handlers
    return next();
  };
}

export async function logAcademyAction(
  db: D1Database,
  actorId: string | null,
  action: string,
  targetType: string,
  targetId: string | null,
  details: Record<string, unknown>,
  request: Request
) {
  const ipHash = await hashIp(request.headers.get('CF-Connecting-IP') || '');
  await db
    .prepare(
      'INSERT INTO academy_audit_log (id, actor_id, action, target_type, target_id, details, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(
      crypto.randomUUID(),
      actorId,
      action,
      targetType,
      targetId,
      JSON.stringify(details),
      ipHash,
      new Date().toISOString()
    )
    .run();
}

export async function hashIp(ip: string): Promise<string> {
  if (!ip) return '';
  const data = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
