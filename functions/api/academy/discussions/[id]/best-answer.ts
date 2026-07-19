import { Env, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// Marks a reply as the best answer to its thread — instructor-only. Toggles
// off if already marked; marking a new one un-marks any prior best answer
// in the same thread (one best answer per parent question).
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;

  if (user.role !== 'admin') {
    return errorResponse('Only instructors can mark a best answer', 403, request);
  }

  const discussionId = params.id as string;
  if (!discussionId) return errorResponse('Discussion ID required', 400, request);

  const discussion = await db.prepare('SELECT id, parent_id, is_best_answer FROM academy_discussions WHERE id = ?').bind(discussionId).first() as any;
  if (!discussion) return errorResponse('Discussion post not found', 404, request);
  if (!discussion.parent_id) return errorResponse('Only replies can be marked as the best answer', 400, request);

  if (discussion.is_best_answer) {
    await db.prepare('UPDATE academy_discussions SET is_best_answer = 0 WHERE id = ?').bind(discussionId).run();
    return corsResponse({ success: true, isBestAnswer: false }, 200, request);
  }

  await db.prepare('UPDATE academy_discussions SET is_best_answer = 0 WHERE parent_id = ?').bind(discussion.parent_id).run();
  await db.prepare('UPDATE academy_discussions SET is_best_answer = 1 WHERE id = ?').bind(discussionId).run();

  return corsResponse({ success: true, isBestAnswer: true }, 200, request);
};
