import { Env, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// Lists peer-review assignments given to the current student, with enough
// submission/assignment context to actually review them.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;

  const { results } = await db.prepare(`
    SELECT pr.id, pr.status, pr.feedback_text, pr.score, pr.assigned_at, pr.submitted_at,
           sub.submission_text, sub.submission_file_url,
           a.prompt_text, a.max_score,
           u.full_name as author_name
    FROM academy_peer_reviews pr
    JOIN academy_assignment_submissions sub ON pr.submission_id = sub.id
    JOIN academy_assignments a ON sub.assignment_id = a.id
    JOIN academy_users u ON sub.user_id = u.id
    WHERE pr.reviewer_user_id = ?
    ORDER BY pr.assigned_at DESC
  `).bind(user.id).all();

  return corsResponse({ success: true, reviews: results }, 200, request);
};
