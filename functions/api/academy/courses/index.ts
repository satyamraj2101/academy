import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  if (!env.DB) return errorResponse('Database not configured', 503);

  // Get all published courses
  const { results } = await env.DB.prepare(`
    SELECT c.id, c.title, c.description, c.level, c.duration, c.price_usd, c.price_inr,
           c.image_url as image, c.category, c.platforms, c.enrollment_count, c.avg_rating,
           u.full_name as instructor_name,
           (SELECT COUNT(*) FROM academy_course_reviews r WHERE r.course_id = c.id) as review_count,
           (
             SELECT json_group_array(json_object('courseId', p.prerequisite_course_id, 'title', pc.title, 'enforcement', p.enforcement))
             FROM academy_course_prerequisites p
             JOIN academy_courses pc ON p.prerequisite_course_id = pc.id
             WHERE p.course_id = c.id
           ) as prerequisites_json
    FROM academy_courses c
    LEFT JOIN academy_users u ON c.instructor_id = u.id
    WHERE c.status = 'published' OR c.is_published = 1
  `).all();

  // Map platforms from JSON string to array
  const formattedResults = results.map((r: any) => ({
    ...r,
    platforms: r.platforms ? JSON.parse(r.platforms) : [],
    prerequisites: r.prerequisites_json ? JSON.parse(r.prerequisites_json) : [],
    prerequisites_json: undefined,
  }));

  return new Response(JSON.stringify({
    success: true,
    courses: formattedResults
  }), { status: 200, headers: CORS_HEADERS });
};
