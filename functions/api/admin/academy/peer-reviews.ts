import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';

interface Env {
  DB?: D1Database;
  ADMIN_JWT_AUDIENCE?: string;
  ENV?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// Lists reviewer assignments for a submission, so an instructor can see who's
// already assigned before manually adding another reviewer.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;
  if (!hasPermission(context.admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  const { db } = context;
  const url = new URL(request.url);
  const submissionId = url.searchParams.get('submissionId');
  if (!submissionId) return errorResponse('Missing submissionId', 400);

  const { results } = await db.prepare(`
    SELECT pr.id, pr.status, pr.score, pr.feedback_text, pr.assigned_by, pr.assigned_at, u.full_name as reviewer_name, u.email as reviewer_email
    FROM academy_peer_reviews pr
    JOIN academy_users u ON pr.reviewer_user_id = u.id
    WHERE pr.submission_id = ?
    ORDER BY pr.assigned_at ASC
  `).bind(submissionId).all();

  return corsResponse({ success: true, reviewers: results });
};

// Instructor manually assigns a specific student as a reviewer for a submission.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;
  if (!hasPermission(context.admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  const { db, admin } = context;

  try {
    const data = await request.json() as any;
    const { submission_id, reviewer_user_id } = data;
    if (!submission_id || !reviewer_user_id) return errorResponse('Missing required fields', 400);

    const existing = await db.prepare('SELECT id FROM academy_peer_reviews WHERE submission_id = ? AND reviewer_user_id = ?')
      .bind(submission_id, reviewer_user_id).first();
    if (existing) return errorResponse('This student is already assigned to review this submission', 409);

    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO academy_peer_reviews (id, submission_id, reviewer_user_id, status, assigned_by, assigned_at)
      VALUES (?, ?, ?, 'pending', ?, ?)
    `).bind(id, submission_id, reviewer_user_id, admin.email, new Date().toISOString()).run();

    await logAdminAction(db, admin.email, 'academy.peer_review.assign', 'peer_review', id, { submission_id, reviewer_user_id }, request);

    return corsResponse({ success: true, id });
  } catch (err: any) {
    return errorResponse('Failed to assign reviewer', 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;
  if (!hasPermission(context.admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  const { db, admin } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return errorResponse('Missing peer review id', 400);

  await db.prepare('DELETE FROM academy_peer_reviews WHERE id = ?').bind(id).run();
  await logAdminAction(db, admin.email, 'academy.peer_review.unassign', 'peer_review', id, {}, request);

  return corsResponse({ success: true });
};
