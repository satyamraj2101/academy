import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from './middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// GET /api/academy/auth/preferences
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user, db } = authResult.context;

  const row = await db.prepare('SELECT language, theme, timezone FROM academy_user_preferences WHERE user_id = ?')
    .bind(user.id).first() as any;

  return new Response(JSON.stringify({
    success: true,
    preferences: row || { language: 'en', theme: 'light', timezone: 'UTC' }
  }), { status: 200, headers: CORS_HEADERS });
};

// POST /api/academy/auth/preferences
// Body: { language, theme, timezone }
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user, db } = authResult.context;

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const language = (body.language as string || 'en').slice(0, 5);
  const theme = (body.theme as string || 'light').slice(0, 10);
  const timezone = (body.timezone as string || 'UTC').slice(0, 50);

  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO academy_user_preferences (user_id, language, theme, timezone, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET language = ?, theme = ?, timezone = ?, updated_at = ?
  `).bind(user.id, language, theme, timezone, now, language, theme, timezone, now).run();

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });
};
