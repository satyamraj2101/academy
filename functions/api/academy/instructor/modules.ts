import { Env, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';
import { requireInstructor, assertOwnsCourse, assertOwnsModule } from './_helpers';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const forbidden = requireInstructor(authResult.context);
  if (forbidden) return forbidden;

  const data = await request.json() as any;
  const { course_id, title, description } = data;
  if (!course_id || !title) return errorResponse('Missing required fields', 400, request);

  if (!(await assertOwnsCourse(db, course_id, user.id))) return errorResponse('Course not found or not owned by you', 404, request);

  const id = crypto.randomUUID();
  const maxRow = await db.prepare('SELECT MAX(sort_order) as maxOrder FROM academy_modules WHERE course_id = ?').bind(course_id).first() as any;
  const nextOrder = (maxRow?.maxOrder ?? 0) + 1;

  await db.prepare(`INSERT INTO academy_modules (id, course_id, title, description, sort_order, is_published) VALUES (?, ?, ?, ?, ?, 1)`)
    .bind(id, course_id, title, description || '', nextOrder).run();

  return corsResponse({ success: true, id }, 200, request);
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const forbidden = requireInstructor(authResult.context);
  if (forbidden) return forbidden;

  const data = await request.json() as any;
  const { id, title, description, sort_order, is_published, drip_days, unlock_date } = data;
  if (!id) return errorResponse('Missing module id', 400, request);

  if (!(await assertOwnsModule(db, id, user.id))) return errorResponse('Module not found or not owned by you', 404, request);

  await db.prepare(`
    UPDATE academy_modules SET title = ?, description = ?, sort_order = ?, is_published = ?, drip_days = ?, unlock_date = ? WHERE id = ?
  `).bind(title, description || '', sort_order, is_published === undefined ? 1 : is_published, drip_days ?? null, unlock_date || null, id).run();

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
  if (!id) return errorResponse('Missing module id', 400, request);

  if (!(await assertOwnsModule(db, id, user.id))) return errorResponse('Module not found or not owned by you', 404, request);

  await db.prepare('DELETE FROM academy_modules WHERE id = ?').bind(id).run();
  return corsResponse({ success: true }, 200, request);
};
