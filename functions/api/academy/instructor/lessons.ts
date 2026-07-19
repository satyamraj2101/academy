import { Env, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';
import { requireInstructor, assertOwnsModule, assertOwnsLesson } from './_helpers';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const forbidden = requireInstructor(authResult.context);
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const moduleId = url.searchParams.get('moduleId');
  const id = url.searchParams.get('id');

  if (id) {
    const owned = await assertOwnsLesson(db, id, user.id);
    if (!owned) return errorResponse('Lesson not found or not owned by you', 404, request);
    const lesson = await db.prepare('SELECT * FROM academy_lessons WHERE id = ?').bind(id).first();
    return corsResponse({ success: true, lesson }, 200, request);
  }

  if (!moduleId) return errorResponse('Missing moduleId or id', 400, request);
  if (!(await assertOwnsModule(db, moduleId, user.id))) return errorResponse('Module not found or not owned by you', 404, request);

  const { results } = await db.prepare('SELECT * FROM academy_lessons WHERE module_id = ? ORDER BY sort_order ASC').bind(moduleId).all();
  return corsResponse({ success: true, lessons: results }, 200, request);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const forbidden = requireInstructor(authResult.context);
  if (forbidden) return forbidden;

  const data = await request.json() as any;
  const { module_id, title, content_type, is_preview } = data;
  if (!module_id || !title || !content_type) return errorResponse('Missing required fields', 400, request);

  if (!(await assertOwnsModule(db, module_id, user.id))) return errorResponse('Module not found or not owned by you', 404, request);

  const id = crypto.randomUUID();
  const maxRow = await db.prepare('SELECT MAX(sort_order) as maxOrder FROM academy_lessons WHERE module_id = ?').bind(module_id).first() as any;
  const nextOrder = (maxRow?.maxOrder ?? 0) + 1;

  await db.prepare(`
    INSERT INTO academy_lessons (id, module_id, title, content_type, sort_order, is_preview, is_published)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).bind(id, module_id, title, content_type, nextOrder, is_preview ? 1 : 0).run();

  return corsResponse({ success: true, id }, 200, request);
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const forbidden = requireInstructor(authResult.context);
  if (forbidden) return forbidden;

  const data = await request.json() as any;
  const { id, title, content_type, content_body, video_url, video_duration_minutes, pdf_url, sort_order, is_preview, is_published, drip_days, unlock_date } = data;
  if (!id) return errorResponse('Missing lesson id', 400, request);

  if (!(await assertOwnsLesson(db, id, user.id))) return errorResponse('Lesson not found or not owned by you', 404, request);

  await db.prepare(`
    UPDATE academy_lessons SET
      title = ?, content_type = ?, content_body = ?, video_url = ?, video_duration_minutes = ?, pdf_url = ?,
      sort_order = ?, is_preview = ?, is_published = ?, drip_days = ?, unlock_date = ?
    WHERE id = ?
  `).bind(
    title, content_type, content_body || null, video_url || null, video_duration_minutes || null, pdf_url || null,
    sort_order, is_preview === undefined ? 0 : is_preview, is_published === undefined ? 1 : is_published,
    drip_days ?? null, unlock_date || null, id
  ).run();

  return corsResponse({ success: true }, 200, request);
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const forbidden = requireInstructor(authResult.context);
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return errorResponse('Missing lesson id', 400, request);

  if (!(await assertOwnsLesson(db, id, user.id))) return errorResponse('Lesson not found or not owned by you', 404, request);

  await db.prepare('DELETE FROM academy_lessons WHERE id = ?').bind(id).run();
  return corsResponse({ success: true }, 200, request);
};
