import { Env, verifyAcademyUser, errorResponse, corsOptionsResponse, getCorsHeaders } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user, db } = authResult.context;

  try {
    const { results } = await db.prepare(`
      SELECT id, source_user_id, source_event, referral_level, credits_earned, created_at, status
      FROM academy_referral_credits
      WHERE beneficiary_id = ?
      ORDER BY created_at DESC
    `).bind(user.id).all();

    return new Response(JSON.stringify({
      success: true,
      data: results || []
    }), { headers: getCorsHeaders(request) });

  } catch (error) {
    console.error('Error fetching referral credits:', error);
    return errorResponse('Internal server error', 500);
  }
};
