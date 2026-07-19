import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';

interface Env {
  DB?: D1Database;
  ADMIN_JWT_AUDIENCE?: string;
  ENV?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;

  if (!hasPermission(context.admin, 'academy')) {
    return errorResponse('Forbidden — insufficient permissions', 403);
  }

  const { db } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '25', 10);
  const offset = (page - 1) * pageSize;

  if (id) {
    const course = await db.prepare(`
      SELECT c.*, u.full_name as instructor_name, u.email as instructor_email
      FROM academy_courses c LEFT JOIN academy_users u ON c.instructor_id = u.id
      WHERE c.id = ?
    `).bind(id).first();
    if (!course) return errorResponse('Course not found', 404);
    return corsResponse(course);
  }

  const { results } = await db
    .prepare(`
      SELECT c.*, u.full_name as instructor_name, u.email as instructor_email,
        (SELECT COUNT(*) FROM academy_enrollments e WHERE e.course_id = c.id AND e.status = 'active') as students
      FROM academy_courses c LEFT JOIN academy_users u ON c.instructor_id = u.id
      ORDER BY c.created_at DESC LIMIT ? OFFSET ?
    `)
    .bind(pageSize, offset)
    .all();

  const countRow = await db.prepare('SELECT COUNT(*) as total FROM academy_courses').first() as any;
  const total = countRow?.total ?? 0;

  return corsResponse({ courses: results, total, page, pageSize });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;

  if (!hasPermission(context.admin, 'academy')) {
    return errorResponse('Forbidden — insufficient permissions', 403);
  }

  const { db, admin } = context;

  try {
    const data = await request.json() as any;
    const id = data.id || crypto.randomUUID();

    await db.prepare(`
      INSERT INTO academy_courses (
        id, title, description, long_description, level, duration, price_usd, price_inr, category, status,
        subtitle, keywords, language_tags, banner_url, thumbnail_url, promo_card_url, passing_score_overall, grading_policy_json,
        has_certification, certification_name,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, data.title, data.description || '', data.long_description || null, data.level || 'Beginner',
      data.duration || '', data.price_usd || 0, data.price_inr || 0, data.category || '', data.status || 'draft',
      data.subtitle || null, data.keywords || null, data.language_tags || null, data.banner_url || null,
      data.thumbnail_url || null, data.promo_card_url || null, data.passing_score_overall || 0, data.grading_policy_json || null,
      data.has_certification ? 1 : 0, data.certification_name || null,
      new Date().toISOString(), new Date().toISOString()
    ).run();

    await logAdminAction(db, admin.email, 'academy.course.create', 'course', id, { title: data.title }, request);

    return corsResponse({ success: true, id });
  } catch (err: any) {
    return errorResponse('Failed to create course', 500);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;

  if (!hasPermission(context.admin, 'academy')) {
    return errorResponse('Forbidden — insufficient permissions', 403);
  }

  const { db, admin } = context;

  try {
    const data = await request.json() as any;
    const {
      id, title, description, long_description, level, duration, price_usd, price_inr, category, status,
      subtitle, keywords, language_tags, banner_url, thumbnail_url, promo_card_url, passing_score_overall, grading_policy_json,
      has_certification, certification_name
    } = data;

    if (!id) return errorResponse('Missing course id', 400);

    const existing = await db.prepare('SELECT status FROM academy_courses WHERE id = ?').bind(id).first() as any;

    await db.prepare(`
      UPDATE academy_courses
      SET
        title = ?, description = ?, long_description = ?, level = ?, duration = ?,
        price_usd = ?, price_inr = ?, category = ?, status = ?,
        subtitle = ?, keywords = ?, language_tags = ?, banner_url = ?,
        thumbnail_url = ?, promo_card_url = ?, passing_score_overall = ?, grading_policy_json = ?,
        has_certification = ?, certification_name = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      title ?? '', description ?? '', long_description || null, level ?? 'Beginner', duration ?? '',
      price_usd || 0, price_inr || 0, category ?? '', status || 'draft',
      subtitle || null, keywords || null, language_tags || null, banner_url || null,
      thumbnail_url || null, promo_card_url || null, passing_score_overall || 0, grading_policy_json || null,
      has_certification ? 1 : 0, certification_name || null,
      new Date().toISOString(), id
    ).run();

    await logAdminAction(db, admin.email, 'academy.course.update', 'course', id, { title, status }, request);

    // Newly published (wasn't published before) — let every active student know.
    if (status === 'published' && existing?.status !== 'published') {
      const { results: users } = await db.prepare('SELECT id FROM academy_users WHERE is_active = 1').all();
      const now = new Date().toISOString();
      for (const u of (users || []) as any[]) {
        await db.prepare(`
          INSERT INTO academy_notifications (id, user_id, title, message, action_url, is_read, created_at)
          VALUES (?, ?, ?, ?, ?, 0, ?)
        `).bind(
          crypto.randomUUID(),
          u.id,
          'New course available',
          `"${title}" just went live — check it out.`,
          `/courses/${id}`,
          now
        ).run();
      }
    }

    return corsResponse({ success: true });
  } catch (err: any) {
    return errorResponse('Failed to update course', 500);
  }
};
