import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser, logAcademyAction } from './middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user, db } = authResult.context;

  // Fetch full user details from DB to get the latest (credits, etc)
  const fullUser = await db.prepare('SELECT id, email, full_name, role, partner_status, credit_balance, referral_code, avatar_url, bio FROM academy_users WHERE id = ?').bind(user.id).first() as any;

  if (!fullUser) {
    return errorResponse('User not found', 404);
  }

  return new Response(JSON.stringify({
    success: true,
    user: {
      id: fullUser.id,
      email: fullUser.email,
      fullName: fullUser.full_name,
      role: fullUser.role,
      partnerStatus: fullUser.partner_status,
      creditBalance: fullUser.credit_balance,
      referralCode: fullUser.referral_code,
      avatarUrl: fullUser.avatar_url,
      bio: fullUser.bio
    }
  }), { status: 200, headers: CORS_HEADERS });
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user, db } = authResult.context;

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const fullName = (body.fullName as string || '').trim();
  const bio = (body.bio as string || '').trim();
  const avatarUrl = (body.avatarUrl as string || '').trim();

  const updates: string[] = [];
  const values: string[] = [];

  if (fullName) {
    updates.push('full_name = ?');
    values.push(fullName);
  }
  if (body.bio !== undefined) {
    updates.push('bio = ?');
    values.push(bio);
  }
  if (body.avatarUrl !== undefined) {
    updates.push('avatar_url = ?');
    values.push(avatarUrl);
  }

  if (updates.length === 0) {
    return errorResponse('No valid fields to update', 400);
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());

  values.push(user.id); // for WHERE clause

  await db.prepare(`UPDATE academy_users SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  await logAcademyAction(db, user.id, 'user.update_profile', 'user', user.id, { fields_updated: updates.length - 1 }, request);

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });
};
