import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission } from '../../../middleware';

interface Env {
  DB?: D1Database;
  ADMIN_JWT_AUDIENCE?: string;
  ENV?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, params, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;

  if (!hasPermission(context.admin, 'academy')) {
    return errorResponse('Forbidden — insufficient permissions', 403);
  }

  const { db } = context;
  const id = params.id as string;
  if (!id) return errorResponse('Course ID is required', 400);

  try {
    // 1. Fetch Course
    const course = await db.prepare('SELECT * FROM academy_courses WHERE id = ?').bind(id).first();
    if (!course) return errorResponse('Course not found', 404);

    // 2. Fetch Modules
    const { results: modules } = await db.prepare(`
      SELECT * FROM academy_modules WHERE course_id = ? ORDER BY sort_order ASC
    `).bind(id).all();

    // 3. Fetch Lessons
    const { results: lessons } = await db.prepare(`
      SELECT * FROM academy_lessons 
      WHERE module_id IN (SELECT id FROM academy_modules WHERE course_id = ?) 
      ORDER BY sort_order ASC
    `).bind(id).all();

    // 4. Fetch Sections
    const { results: sections } = await db.prepare(`
      SELECT s.* FROM academy_lesson_sections s
      JOIN academy_lessons l ON s.lesson_id = l.id
      JOIN academy_modules m ON l.module_id = m.id
      WHERE m.course_id = ?
      ORDER BY s.sort_order ASC
    `).bind(id).all();

    // Build hierarchical structure
    const structure = modules.map((m: any) => ({
      ...m,
      lessons: lessons
        .filter((l: any) => l.module_id === m.id)
        .map((l: any) => ({
          ...l,
          sections: sections.filter((s: any) => s.lesson_id === l.id)
        }))
    }));

    return corsResponse({
      success: true,
      course,
      structure
    });
  } catch (err: any) {
    console.error('Error fetching course structure:', err);
    return errorResponse('Failed to fetch course structure', 500);
  }
};
