import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, logAdminAction } from './middleware';

interface Env {
  DB?: D1Database;
  ADMIN_JWT_AUDIENCE?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  ENV?: string;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

async function hashApiKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateApiKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `sk_${hex}`;
}

// Key management is restricted to superadmins — a service key is effectively
// a standing credential with whatever permissions it's granted, so issuing
// one shouldn't be delegable the same way ordinary academy permissions are.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;
  if (context.admin.role !== 'superadmin') return errorResponse('Forbidden — superadmin only', 403);

  const { results } = await context.db.prepare(`
    SELECT id, label, permissions, created_by, created_at, last_used_at, revoked_at
    FROM service_api_keys ORDER BY created_at DESC
  `).all();

  return corsResponse({ success: true, keys: results });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;
  if (context.admin.role !== 'superadmin') return errorResponse('Forbidden — superadmin only', 403);

  const { db, admin } = context;

  try {
    const data = await request.json() as any;
    const { label, permissions } = data;
    if (!label?.trim()) return errorResponse('Missing label', 400);

    const plaintextKey = generateApiKey();
    const keyHash = await hashApiKey(plaintextKey);
    const id = crypto.randomUUID();

    await db.prepare(`
      INSERT INTO service_api_keys (id, key_hash, label, permissions, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, keyHash, label.trim(), JSON.stringify(Array.isArray(permissions) ? permissions : ['academy']), admin.email, new Date().toISOString()).run();

    await logAdminAction(db, admin.email, 'service_key.create', 'service_key', id, { label }, request);

    // The plaintext key is returned exactly once — it is never stored or
    // retrievable again after this response.
    return corsResponse({ success: true, id, key: plaintextKey });
  } catch (err: any) {
    return errorResponse('Failed to create service key', 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;
  if (context.admin.role !== 'superadmin') return errorResponse('Forbidden — superadmin only', 403);

  const { db, admin } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return errorResponse('Missing key id', 400);

  await db.prepare('UPDATE service_api_keys SET revoked_at = ? WHERE id = ?').bind(new Date().toISOString(), id).run();
  await logAdminAction(db, admin.email, 'service_key.revoke', 'service_key', id, {}, request);

  return corsResponse({ success: true });
};
