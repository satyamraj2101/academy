import { Env, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// Submits a student's peer review — only the assigned reviewer may do this.
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const reviewId = params.id as string;
  if (!reviewId) return errorResponse('Review ID required', 400, request);

  const review = await db.prepare('SELECT id, reviewer_user_id FROM academy_peer_reviews WHERE id = ?').bind(reviewId).first() as any;
  if (!review) return errorResponse('Peer review assignment not found', 404, request);
  if (review.reviewer_user_id !== user.id) return errorResponse('Forbidden', 403, request);

  let body: { feedbackText?: string; score?: number };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400, request);
  }
  if (!body.feedbackText?.trim()) return errorResponse('Feedback is required', 400, request);

  await db.prepare(`
    UPDATE academy_peer_reviews SET feedback_text = ?, score = ?, status = 'submitted', submitted_at = ? WHERE id = ?
  `).bind(body.feedbackText.trim(), body.score ?? null, new Date().toISOString(), reviewId).run();

  return corsResponse({ success: true }, 200, request);
};
