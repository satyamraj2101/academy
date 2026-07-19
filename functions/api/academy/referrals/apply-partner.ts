import { Env, verifyAcademyUser, errorResponse, corsOptionsResponse, CORS_HEADERS } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user: authUser } = authResult.context;

  if (!env.DB) {
    return errorResponse('Database not configured', 503);
  }

  try {
    const user = await env.DB.prepare('SELECT referral_code, partner_status FROM academy_users WHERE id = ?')
      .bind(authUser.id)
      .first();

    if (!user || !user.referral_code) {
      return errorResponse('User not found', 404);
    }

    if (user.partner_status === 'approved') {
      return errorResponse('Already an approved partner', 400);
    }
    
    if (user.partner_status === 'pending') {
      return errorResponse('Partner application is already pending', 400);
    }

    // Verify they have at least 2 referrals
    const { count } = await env.DB.prepare('SELECT COUNT(*) as count FROM academy_users WHERE referred_by = ?')
      .bind(user.referral_code)
      .first() as { count: number };

    if (count < 2) {
      return errorResponse('You need at least 2 referrals to apply for Partner status', 400);
    }

    const now = new Date().toISOString();
    await env.DB.prepare('UPDATE academy_users SET partner_status = ?, partner_applied_at = ? WHERE id = ?')
      .bind('pending', now, authUser.id)
      .run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Application submitted successfully'
    }), { headers: CORS_HEADERS });

  } catch (error) {
    console.error('Error applying for partner:', error);
    return errorResponse('Internal server error', 500);
  }
};
