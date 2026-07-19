import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, logAdminAction } from './middleware';

interface Env {
  DB?: D1Database;
  ADMIN_JWT_AUDIENCE?: string;
  ENV?: string;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { admin, db } = result.context;
  if (admin.role !== 'superadmin') return errorResponse('Forbidden', 403);

  const users = await db.prepare('SELECT id, email, name, role, permissions, avatar_url, created_at, last_login, is_active FROM admin_users ORDER BY created_at DESC').all();
  return corsResponse({ users: users.results || [] });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { admin, db } = result.context;
  if (admin.role !== 'superadmin') return errorResponse('Forbidden', 403);

  const body = await request.json() as Record<string, unknown>;
  const { email, name, role, permissions } = body as { email: string; name: string; role: string; permissions: string[] };
  if (!email || !name) return errorResponse('email and name are required');

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  try {
    await db.prepare(
      'INSERT INTO admin_users (id, email, name, role, permissions, created_at, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)'
    ).bind(id, email, name, role || 'viewer', JSON.stringify(permissions || []), now).run();

    await logAdminAction(db, admin.email, 'user_created', 'admin_user', id, { email, role }, request);
    return corsResponse({ ok: true, id });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    // Check if it's a unique constraint violation on email
    if (msg.includes('UNIQUE constraint failed')) {
      return errorResponse('A user with this email already exists', 400);
    }
    return errorResponse(`Database error: ${msg}`, 500);
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { admin, db } = result.context;
  if (admin.role !== 'superadmin') return errorResponse('Forbidden', 403);

  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();
  if (!id) return errorResponse('User ID required');

  const body = await request.json() as Record<string, unknown>;
  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) { updates.push('name = ?'); values.push(body.name); }
  if (body.role !== undefined) { updates.push('role = ?'); values.push(body.role); }
  if (body.permissions !== undefined) { updates.push('permissions = ?'); values.push(JSON.stringify(body.permissions)); }
  if (body.is_active !== undefined) { updates.push('is_active = ?'); values.push(body.is_active ? 1 : 0); }

  if (updates.length === 0) return errorResponse('No fields to update');
  values.push(id);

  await db.prepare(`UPDATE admin_users SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
  await logAdminAction(db, admin.email, 'user_updated', 'admin_user', id, body, request);
  return corsResponse({ ok: true });
};
