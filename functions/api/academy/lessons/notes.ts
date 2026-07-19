import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// GET /api/academy/lessons/notes?lessonId=XXX
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user, db } = authResult.context;
  const url = new URL(request.url);
  const lessonId = url.searchParams.get('lessonId');

  if (!lessonId) return errorResponse('lessonId is required', 400);

  const row = await db.prepare('SELECT notes FROM academy_lesson_notes WHERE user_id = ? AND lesson_id = ?')
    .bind(user.id, lessonId).first() as any;

  return new Response(JSON.stringify({
    success: true,
    notes: row ? row.notes : ''
  }), { status: 200, headers: CORS_HEADERS });
};

// POST /api/academy/lessons/notes
// Body: { lessonId, notes }
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

  const lessonId = body.lessonId as string;
  const notes = body.notes as string;

  if (!lessonId) return errorResponse('lessonId is required', 400);
  if (notes === undefined) return errorResponse('notes content is required', 400);

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db.prepare(`
    INSERT INTO academy_lesson_notes (id, user_id, lesson_id, notes, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, lesson_id) DO UPDATE SET notes = ?, updated_at = ?
  `).bind(id, user.id, lessonId, notes, now, notes, now).run();

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS });
};
