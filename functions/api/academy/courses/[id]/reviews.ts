import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!env.DB) return errorResponse('Database not configured', 503);
  const courseId = params.id as string;

  const { results } = await env.DB.prepare(`
    SELECT r.id, r.rating, r.review_text, r.created_at, u.full_name as user_name, u.avatar_url as user_avatar
    FROM academy_course_reviews r
    JOIN academy_users u ON r.user_id = u.id
    WHERE r.course_id = ?
    ORDER BY r.created_at DESC
    LIMIT 50
  `).bind(courseId).all();

  const stats = await env.DB.prepare(`
    SELECT COUNT(*) as count, AVG(rating) as avg,
           SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as r5,
           SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as r4,
           SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as r3,
           SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as r2,
           SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as r1
    FROM academy_course_reviews WHERE course_id = ?
  `).bind(courseId).first() as any;

  let myReview = null;
  const authResult = await verifyAcademyUser(request, env).catch(() => null);
  if (authResult && !('error' in authResult)) {
    const { user } = authResult.context;
    myReview = await env.DB.prepare('SELECT id, rating, review_text FROM academy_course_reviews WHERE course_id = ? AND user_id = ?')
      .bind(courseId, user.id).first();
  }

  return corsResponse({
    success: true,
    reviews: results,
    myReview,
    stats: {
      count: stats?.count || 0,
      average: stats?.avg ? Math.round(stats.avg * 10) / 10 : 0,
      distribution: { 5: stats?.r5 || 0, 4: stats?.r4 || 0, 3: stats?.r3 || 0, 2: stats?.r2 || 0, 1: stats?.r1 || 0 }
    }
  }, 200, request);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const courseId = params.id as string;

  const enrollment = await db.prepare('SELECT id FROM academy_enrollments WHERE user_id = ? AND course_id = ?').bind(user.id, courseId).first();
  if (!enrollment) return errorResponse('You must be enrolled in this course to leave a review', 403, request);

  let body: { rating: number; reviewText?: string };
  try {
    body = await request.json() as { rating: number; reviewText?: string };
  } catch {
    return errorResponse('Invalid JSON body', 400, request);
  }

  const rating = Math.round(Number(body.rating));
  if (!rating || rating < 1 || rating > 5) return errorResponse('Rating must be between 1 and 5', 400, request);

  const now = new Date().toISOString();
  const existing = await db.prepare('SELECT id FROM academy_course_reviews WHERE course_id = ? AND user_id = ?').bind(courseId, user.id).first() as any;

  if (existing) {
    await db.prepare('UPDATE academy_course_reviews SET rating = ?, review_text = ?, updated_at = ? WHERE id = ?')
      .bind(rating, body.reviewText || null, now, existing.id).run();
  } else {
    await db.prepare(`
      INSERT INTO academy_course_reviews (id, course_id, user_id, rating, review_text, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), courseId, user.id, rating, body.reviewText || null, now, now).run();
  }

  const agg = await db.prepare('SELECT AVG(rating) as avg FROM academy_course_reviews WHERE course_id = ?').bind(courseId).first() as any;
  await db.prepare('UPDATE academy_courses SET avg_rating = ? WHERE id = ?').bind(Math.round((agg?.avg || 0) * 10) / 10, courseId).run();

  return corsResponse({ success: true }, 200, request);
};
