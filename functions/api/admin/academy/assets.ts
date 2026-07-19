import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';

interface Env {
  DB?: D1Database;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;

  if (!hasPermission(context.admin, 'academy')) {
    return errorResponse('Forbidden — insufficient permissions', 403);
  }

  const { db, admin } = context;

  try {
    // We fetch assets for this specific instructor (admin)
    const { results } = await db.prepare(`
      SELECT * FROM academy_assets 
      WHERE instructor_id = ? 
      ORDER BY created_at DESC
    `).bind(admin.id).all();

    return corsResponse({ success: true, assets: results });
  } catch (err: any) {
    console.error('Failed to fetch assets:', err);
    return errorResponse('Failed to fetch assets', 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;

  if (!hasPermission(context.admin, 'academy')) {
    return errorResponse('Forbidden — insufficient permissions', 403);
  }

  const { db, admin } = context;

  try {
    const data = await request.json() as any;
    const { file_name, file_type, file_size, url } = data;

    if (!file_name || !file_type || !url) {
      return errorResponse('Missing required fields', 400);
    }

    const id = crypto.randomUUID();

    await db.prepare(`
      INSERT INTO academy_assets (id, instructor_id, file_name, file_type, file_size, url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, admin.id, file_name, file_type, file_size || 0, url, new Date().toISOString()
    ).run();

    await logAdminAction(db, admin.email, 'academy.asset.create', 'asset', id, { file_name, file_type }, request);

    return corsResponse({ success: true, asset: { id, instructor_id: admin.id, file_name, file_type, file_size, url } });
  } catch (err: any) {
    console.error('Failed to register asset:', err);
    return errorResponse('Failed to register asset', 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;

  if (!hasPermission(context.admin, 'academy')) {
    return errorResponse('Forbidden — insufficient permissions', 403);
  }

  const { db, admin } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) return errorResponse('Missing asset id', 400);

  try {
    await db.prepare('DELETE FROM academy_assets WHERE id = ?').bind(id).run();
    await logAdminAction(db, admin.email, 'academy.asset.delete', 'asset', id, {}, request);
    return corsResponse({ success: true });
  } catch (err: any) {
    console.error('Failed to delete asset:', err);
    return errorResponse('Failed to delete asset', 500);
  }
};
