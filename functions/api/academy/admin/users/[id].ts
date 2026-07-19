import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!env.DB) return errorResponse('Server misconfigured', 503);

  // Authenticate and verify admin role
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult.context;
  if (user.role !== 'admin') {
    return errorResponse('Unauthorized: Admins only', 403);
  }

  const targetUserId = params.id as string;
  if (!targetUserId) return errorResponse('User ID required', 400);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const { role, is_active } = body;
  if (!role && is_active === undefined) {
    return errorResponse('Nothing to update', 400);
  }

  try {
    const updates = [];
    const bindings = [];
    
    if (role) {
      updates.push('role = ?');
      bindings.push(role);
    }
    
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      bindings.push(is_active === true ? 1 : 0);
    }
    
    updates.push('updated_at = ?');
    bindings.push(new Date().toISOString());
    bindings.push(targetUserId);

    await env.DB.prepare(`
      UPDATE academy_users
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...bindings).run();

    return new Response(JSON.stringify({ success: true, message: 'User updated successfully' }), { status: 200, headers: CORS_HEADERS });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!env.DB) return errorResponse('Server misconfigured', 503);

  // Authenticate and verify admin role
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult.context;
  if (user.role !== 'admin') {
    return errorResponse('Unauthorized: Admins only', 403);
  }

  const targetUserId = params.id as string;
  if (!targetUserId) return errorResponse('User ID required', 400);

  // Prevent admin from deleting themselves
  if (user.id === targetUserId) {
    return errorResponse('Cannot delete your own admin account', 400);
  }

  try {
    await env.DB.prepare(`DELETE FROM academy_users WHERE id = ?`).bind(targetUserId).run();
    return new Response(JSON.stringify({ success: true, message: 'User deleted successfully' }), { status: 200, headers: CORS_HEADERS });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};
