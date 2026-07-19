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
  const { db } = result.context;

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'enquiries';
  const status = url.searchParams.get('status');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  if (type === 'enquiries') {
    let query = 'SELECT * FROM enquiry_submissions';
    const params: unknown[] = [];
    if (status) { query += ' WHERE status = ?'; params.push(status); }
    query += ' ORDER BY submitted_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [submissions, total] = await Promise.all([
      db.prepare(query).bind(...params).all(),
      db.prepare('SELECT COUNT(*) as count FROM enquiry_submissions' + (status ? ' WHERE status = ?' : '')).bind(...(status ? [status] : [])).first() as any,
    ]);
    return corsResponse({ submissions: submissions.results, total: total?.count || 0, page, limit });
  }

  if (type === 'assessments') {
    const submissions = await db.prepare(
      'SELECT * FROM assessment_submissions ORDER BY submitted_at DESC LIMIT ? OFFSET ?'
    ).bind(limit, offset).all();
    const total = await db.prepare('SELECT COUNT(*) as count FROM assessment_submissions').first() as any;
    return corsResponse({ submissions: submissions.results, total: total?.count || 0, page, limit });
  }

  return errorResponse('Invalid type parameter');
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { admin, db } = result.context;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return errorResponse('Submission ID required');

  const body = await request.json() as Record<string, unknown>;
  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.status !== undefined) { updates.push('status = ?'); values.push(body.status); }
  if (body.admin_notes !== undefined) { updates.push('admin_notes = ?'); values.push(body.admin_notes); }
  if (body.assigned_to !== undefined) { updates.push('assigned_to = ?'); values.push(body.assigned_to); }

  if (updates.length === 0) return errorResponse('No fields to update');
  values.push(id);

  await db.prepare(`UPDATE enquiry_submissions SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
  await logAdminAction(db, admin.email, 'submission_updated', 'enquiry', id, body, request);
  return corsResponse({ ok: true });
};
