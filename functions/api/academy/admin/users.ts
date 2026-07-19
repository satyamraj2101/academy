import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) return errorResponse('Server misconfigured', 503);

  // Authenticate and verify admin role
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult.context;
  if (user.role !== 'admin') {
    return errorResponse('Unauthorized: Admins only', 403);
  }

  try {
    const { results } = await env.DB.prepare(`
      SELECT id, email, full_name, role, is_active, created_at, partner_status, credit_balance
      FROM academy_users
      ORDER BY created_at DESC
    `).all();

    return new Response(JSON.stringify({
      success: true,
      users: results
    }), { status: 200, headers: CORS_HEADERS });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};
