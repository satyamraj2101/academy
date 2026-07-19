import { Env, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../../../auth/middleware';
import { requireInstructor } from '../../_helpers';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const forbidden = requireInstructor(authResult.context);
  if (forbidden) return forbidden;

  const id = params.id as string;
  const course = await db.prepare('SELECT * FROM academy_courses WHERE id = ? AND instructor_id = ?').bind(id, user.id).first();
  if (!course) return errorResponse('Course not found or not owned by you', 404, request);

  const { results: modules } = await db.prepare('SELECT * FROM academy_modules WHERE course_id = ? ORDER BY sort_order ASC').bind(id).all();
  const { results: lessons } = await db.prepare(`
    SELECT * FROM academy_lessons WHERE module_id IN (SELECT id FROM academy_modules WHERE course_id = ?) ORDER BY sort_order ASC
  `).bind(id).all();
  const { results: sections } = await db.prepare(`
    SELECT s.* FROM academy_lesson_sections s
    JOIN academy_lessons l ON s.lesson_id = l.id
    JOIN academy_modules m ON l.module_id = m.id
    WHERE m.course_id = ? ORDER BY s.sort_order ASC
  `).bind(id).all();

  const structure = (modules as any[]).map(m => ({
    ...m,
    lessons: (lessons as any[]).filter(l => l.module_id === m.id).map(l => ({
      ...l,
      sections: (sections as any[]).filter(s => s.lesson_id === l.id),
    })),
  }));

  return corsResponse({ success: true, course, structure }, 200, request);
};
