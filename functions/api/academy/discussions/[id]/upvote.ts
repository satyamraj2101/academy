import { Env, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// Toggles the current user's upvote on a discussion post — a second call
// from the same user removes it, preventing double-voting.
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const discussionId = params.id as string;
  if (!discussionId) return errorResponse('Discussion ID required', 400, request);

  const discussion = await db.prepare('SELECT id FROM academy_discussions WHERE id = ?').bind(discussionId).first();
  if (!discussion) return errorResponse('Discussion post not found', 404, request);

  const existing = await db.prepare('SELECT id FROM academy_discussion_upvotes WHERE discussion_id = ? AND user_id = ?')
    .bind(discussionId, user.id).first();

  if (existing) {
    await db.prepare('DELETE FROM academy_discussion_upvotes WHERE discussion_id = ? AND user_id = ?').bind(discussionId, user.id).run();
    await db.prepare('UPDATE academy_discussions SET upvote_count = MAX(0, upvote_count - 1) WHERE id = ?').bind(discussionId).run();
  } else {
    await db.prepare('INSERT INTO academy_discussion_upvotes (id, discussion_id, user_id, created_at) VALUES (?, ?, ?, ?)')
      .bind(crypto.randomUUID(), discussionId, user.id, new Date().toISOString()).run();
    await db.prepare('UPDATE academy_discussions SET upvote_count = upvote_count + 1 WHERE id = ?').bind(discussionId).run();
  }

  const updated = await db.prepare('SELECT upvote_count FROM academy_discussions WHERE id = ?').bind(discussionId).first() as any;

  return corsResponse({ success: true, upvoted: !existing, upvoteCount: updated?.upvote_count ?? 0 }, 200, request);
};
