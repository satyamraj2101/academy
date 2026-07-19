import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';
import { getUnmetPrerequisites } from '../_prerequisites';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user, db } = authResult.context;

  // Get user's active enrollments
  const { results } = await db.prepare(`
    SELECT e.id as enrollment_id, e.progress_percent, e.enrolled_at,
           c.id as course_id, c.title, c.image_url, c.level, c.duration
    FROM academy_enrollments e
    JOIN academy_courses c ON e.course_id = c.id
    WHERE e.user_id = ? AND e.status = 'active'
    ORDER BY e.enrolled_at DESC
  `).bind(user.id).all();

  return new Response(JSON.stringify({
    success: true,
    enrollments: results
  }), { status: 200, headers: CORS_HEADERS });
};

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

  const courseId = body.courseId as string;
  if (!courseId) return errorResponse('courseId is required', 400);

  // Check if course exists and get price
  const course = await db.prepare('SELECT id, price_inr FROM academy_courses WHERE id = ?').bind(courseId).first();
  if (!course) return errorResponse('Course not found', 404);

  const existing = await db.prepare('SELECT id FROM academy_enrollments WHERE user_id = ? AND course_id = ?').bind(user.id, courseId).first();
  if (existing) {
    return errorResponse('Already enrolled in this course', 409);
  }

  const unmetHard = (await getUnmetPrerequisites(db, user.id, courseId)).filter(p => p.enforcement === 'hard');
  if (unmetHard.length > 0) {
    return errorResponse(`Complete "${unmetHard[0].title}" first before enrolling in this course.`, 403);
  }

  const enrollmentId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO academy_enrollments (id, user_id, course_id, enrolled_at, progress_percent, status)
    VALUES (?, ?, ?, ?, 0, 'active')
  `).bind(enrollmentId, user.id, courseId, now).run();
  
  // Increment enrollment count
  await db.prepare('UPDATE academy_courses SET enrollment_count = enrollment_count + 1 WHERE id = ?').bind(courseId).run();

  // Referral commission for PAID courses is awarded in payments/verify.ts and
  // the payment webhooks (the actual points where a purchase completes) —
  // see functions/api/academy/_referrals.ts. This endpoint only ever creates
  // enrollments directly (used for free courses, where no commission applies
  // anyway), so there is deliberately no commission logic here.

  return new Response(JSON.stringify({
    success: true,
    enrollmentId
  }), { status: 201, headers: CORS_HEADERS });
};
