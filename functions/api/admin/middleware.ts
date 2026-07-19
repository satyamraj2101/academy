// SpotCLM Admin Middleware — Validates Cloudflare Access JWT
// Every admin API endpoint calls verifyAdminRequest() first.

import { verifyAccessJwt } from './verifyAccessJwt';

interface Env {
  DB?: D1Database;
  ADMIN_JWT_AUDIENCE?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  ENV?: string;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  is_active: number;
}

export interface AdminContext {
  admin: AdminUser;
  db: D1Database;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cf-Access-Jwt-Assertion',
  'Content-Type': 'application/json',
};

export const corsResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });

export const corsOptionsResponse = () =>
  new Response(null, { status: 204, headers: CORS_HEADERS });

export const errorResponse = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), { status, headers: CORS_HEADERS });

async function hashApiKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Resolves a `Bearer sk_...` service API key (used by non-interactive
// clients like the MCP server) to an AdminContext, bypassing Cloudflare
// Access entirely. Distinct from the dev-only email-bearer fallback below —
// this path is valid in production and gated purely by key possession.
async function resolveServiceApiKey(env: Env, token: string): Promise<AdminContext | null> {
  if (!env.DB) return null;
  const keyHash = await hashApiKey(token);
  const key = await env.DB.prepare('SELECT * FROM service_api_keys WHERE key_hash = ? AND revoked_at IS NULL').bind(keyHash).first() as any;
  if (!key) return null;

  await env.DB.prepare('UPDATE service_api_keys SET last_used_at = ? WHERE id = ?').bind(new Date().toISOString(), key.id).run();

  let permissions: string[] = [];
  try { permissions = JSON.parse(key.permissions || '[]'); } catch { /* ignore */ }

  return {
    admin: {
      id: `service:${key.id}`,
      email: `service-key:${key.label}`,
      name: `Service Key: ${key.label}`,
      role: 'service',
      permissions,
      is_active: 1,
    },
    db: env.DB,
  };
}

export async function verifyAdminRequest(
  request: Request,
  env: Env
): Promise<{ context: AdminContext } | { error: Response }> {
  if (!env.DB) {
    return { error: errorResponse('Database not configured', 503) };
  }

  const isDev = env.ENV === 'development';
  const jwtAssertion = request.headers.get('Cf-Access-Jwt-Assertion');
  let adminEmail: string | null = null;

  const authHeaderForKey = request.headers.get('Authorization');
  if (authHeaderForKey?.startsWith('Bearer sk_')) {
    const serviceContext = await resolveServiceApiKey(env, authHeaderForKey.slice(7));
    if (!serviceContext) {
      return { error: errorResponse('Unauthorized — invalid or revoked service API key', 401) };
    }
    return { context: serviceContext };
  }

  if (jwtAssertion) {
    // Fail closed: without a configured team domain we cannot verify the
    // signature, so a present-but-unverifiable token is rejected outright
    // rather than trusted. This is the only path that grants admin access
    // in production — it must never fall back to trusting an unsigned decode.
    if (!env.CF_ACCESS_TEAM_DOMAIN) {
      console.error('CF_ACCESS_TEAM_DOMAIN is not configured — refusing to trust unverified JWT');
      return { error: errorResponse('Server misconfigured — admin auth unavailable', 503) };
    }
    try {
      const payload = await verifyAccessJwt(jwtAssertion, env.CF_ACCESS_TEAM_DOMAIN, env.ADMIN_JWT_AUDIENCE);
      adminEmail = payload.email;
    } catch (e) {
      console.error('JWT verification failed:', (e as Error).message);
      return { error: errorResponse('Unauthorized — invalid admin session', 401) };
    }
  }

  // Dev-only fallback for local testing without Cloudflare Access in front.
  if (!adminEmail && isDev) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      adminEmail = authHeader.slice(7);
    }
  }

  if (!adminEmail) {
    return { error: errorResponse('Unauthorized — No valid admin session', 401) };
  }

  // Look up the admin in D1
  const adminUser = await env.DB
    .prepare('SELECT * FROM admin_users WHERE email = ? AND is_active = 1')
    .bind(adminEmail)
    .first() as any;

  if (!adminUser) {
    return { error: errorResponse('Forbidden — Admin account not found or inactive', 403) };
  }

  // Parse permissions JSON
  let permissions: string[] = [];
  try { permissions = JSON.parse(adminUser.permissions as unknown as string || '[]'); } catch { /* ignore */ }

  // Update last_login timestamp
  await env.DB
    .prepare('UPDATE admin_users SET last_login = ? WHERE email = ?')
    .bind(new Date().toISOString(), adminEmail)
    .run();

  return {
    context: {
      admin: { ...adminUser, permissions },
      db: env.DB,
    },
  };
}

export function hasPermission(admin: AdminUser, permission: string): boolean {
  if (admin.role === 'superadmin') return true;
  return admin.permissions.includes(permission);
}

export async function logAdminAction(
  db: D1Database,
  adminEmail: string,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown>,
  request: Request
) {
  const ipHash = await hashIp(request.headers.get('CF-Connecting-IP') || '');
  await db
    .prepare(
      'INSERT INTO admin_audit_log (id, admin_email, action, target_type, target_id, details, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(
      crypto.randomUUID(),
      adminEmail,
      action,
      targetType,
      targetId,
      JSON.stringify(details),
      ipHash,
      new Date().toISOString()
    )
    .run();
}

async function hashIp(ip: string): Promise<string> {
  if (!ip) return '';
  const data = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
