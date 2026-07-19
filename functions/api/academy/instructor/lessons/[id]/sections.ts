import { Env, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../../../auth/middleware';
import { requireInstructor, assertOwnsLesson } from '../../_helpers';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const forbidden = requireInstructor(authResult.context);
  if (forbidden) return forbidden;

  const lessonId = params.id as string;
  if (!(await assertOwnsLesson(db, lessonId, user.id))) return errorResponse('Lesson not found or not owned by you', 404, request);

  const data = await request.json() as { sections: Array<{ section_type: string; content: string; is_mandatory?: boolean }> };
  const sections = data.sections || [];
  const now = new Date().toISOString();

  const statements = [
    db.prepare('DELETE FROM academy_lesson_sections WHERE lesson_id = ?').bind(lessonId),
    ...sections.map((s, i) =>
      db.prepare(`
        INSERT INTO academy_lesson_sections (id, lesson_id, section_type, sort_order, content, is_mandatory, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(crypto.randomUUID(), lessonId, s.section_type, i + 1, s.content || '', s.is_mandatory ? 1 : 0, now)
    ),
  ];

  await db.batch(statements);
  return corsResponse({ success: true, count: sections.length }, 200, request);
};
