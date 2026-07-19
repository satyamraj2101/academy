import { Env, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';
import { requireInstructor } from './_helpers';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const forbidden = requireInstructor(authResult.context);
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (id) {
    const course = await db.prepare('SELECT * FROM academy_courses WHERE id = ? AND instructor_id = ?').bind(id, user.id).first();
    if (!course) return errorResponse('Course not found', 404, request);
    return corsResponse({ success: true, course }, 200, request);
  }

  const { results } = await db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM academy_enrollments e WHERE e.course_id = c.id AND e.status='active') as active_enrollments
    FROM academy_courses c WHERE c.instructor_id = ? ORDER BY c.created_at DESC
  `).bind(user.id).all();

  return corsResponse({ success: true, courses: results }, 200, request);
};

// Instructors always create their own courses as drafts — publishing (going
// live for enrollment) requires a separate, deliberate action.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const forbidden = requireInstructor(authResult.context);
  if (forbidden) return forbidden;

  try {
    const data = await request.json() as any;
    const { title, description, long_description, level, duration, category } = data;
    if (!title) return errorResponse('Missing title', 400, request);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO academy_courses (
        id, title, description, long_description, level, duration, price_usd, price_inr, category, status,
        instructor_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, 'draft', ?, ?, ?)
    `).bind(id, title, description || '', long_description || null, level || 'Beginner', duration || '', category || '', user.id, now, now).run();

    return corsResponse({ success: true, id }, 200, request);
  } catch (err: any) {
    return errorResponse('Failed to create course', 500, request);
  }
};

// Full-record replace, matching the admin courses endpoint's own semantics —
// callers must send the complete course object back (fetch via GET ?id= first).
export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const forbidden = requireInstructor(authResult.context);
  if (forbidden) return forbidden;

  try {
    const data = await request.json() as any;
    const { id } = data;
    if (!id) return errorResponse('Missing course id', 400, request);

    const owned = await db.prepare('SELECT id FROM academy_courses WHERE id = ? AND instructor_id = ?').bind(id, user.id).first();
    if (!owned) return errorResponse('Course not found or not owned by you', 404, request);

    const {
      title, description, long_description, level, duration, price_usd, price_inr, category, status,
      subtitle, keywords, language_tags, banner_url, thumbnail_url, promo_card_url,
      has_certification, certification_name,
    } = data;

    await db.prepare(`
      UPDATE academy_courses SET
        title = ?, description = ?, long_description = ?, level = ?, duration = ?,
        price_usd = ?, price_inr = ?, category = ?, status = ?,
        subtitle = ?, keywords = ?, language_tags = ?, banner_url = ?, thumbnail_url = ?, promo_card_url = ?,
        has_certification = ?, certification_name = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      title ?? '', description ?? '', long_description || null, level ?? 'Beginner', duration ?? '',
      price_usd || 0, price_inr || 0, category ?? '', status || 'draft',
      subtitle || null, keywords || null, language_tags || null, banner_url || null, thumbnail_url || null, promo_card_url || null,
      has_certification ? 1 : 0, certification_name || null, new Date().toISOString(), id
    ).run();

    return corsResponse({ success: true }, 200, request);
  } catch (err: any) {
    console.error('Instructor course update error:', err);
    return errorResponse('Failed to update course', 500, request);
  }
};
