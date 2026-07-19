import { Env, verifyAcademyUser, errorResponse, corsOptionsResponse, getCorsHeaders } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user: authUser } = authResult.context;

  if (!env.DB) {
    return errorResponse('Database not configured', 503);
  }

  try {
    const user = await env.DB.prepare('SELECT referral_code, credit_balance, total_credits_earned, partner_status FROM academy_users WHERE id = ?')
      .bind(authUser.id)
      .first();

    if (!user || !user.referral_code) {
      return errorResponse('User or referral code not found', 404);
    }

    const myCode = user.referral_code as string;
    const partnerStatus = user.partner_status as string;

    // Get L1 Referrals with extra stats (courses bought and last active proxy)
    const { results: l1Referrals } = await env.DB.prepare(`
      SELECT u.id, u.full_name, u.created_at, u.updated_at, u.referral_code, u.credit_balance,
             (SELECT COUNT(*) FROM academy_enrollments e WHERE e.user_id = u.id) as courses_bought
      FROM academy_users u
      WHERE u.referred_by = ?
      ORDER BY u.created_at DESC
    `).bind(myCode).all();

    // Get L2 Referrals ONLY if partner_status is approved
    let l2Referrals: Record<string, any>[] = [];
    if (partnerStatus === 'approved' && l1Referrals && l1Referrals.length > 0) {
      // Query L2 referrals for each L1 code individually to avoid SQL injection
      const l2Results = await Promise.all(
        l1Referrals.map((r: any) =>
          env.DB!.prepare(`
            SELECT u.id, u.full_name, u.created_at, u.updated_at, u.referred_by,
                   (SELECT COUNT(*) FROM academy_enrollments e WHERE e.user_id = u.id) as courses_bought
            FROM academy_users u
            WHERE u.referred_by = ?
            ORDER BY u.created_at DESC
          `).bind(r.referral_code).all()
        )
      );
      l2Referrals = l2Results.flatMap(r => r.results || []);
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        referralCode: myCode,
        creditBalance: user.credit_balance,
        totalCreditsEarned: user.total_credits_earned,
        partnerStatus: partnerStatus,
        l1: l1Referrals || [],
        l2: l2Referrals,
      }
    }), { headers: getCorsHeaders(request) });

  } catch (error: any) {
    console.error('Error fetching referral tree:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: getCorsHeaders(request) });
  }
};
