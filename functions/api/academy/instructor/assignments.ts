import { Env, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';
import { requireInstructor, assertOwnsLesson } from './_helpers';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;
  const forbidden = requireInstructor(authResult.context);
  if (forbidden) return forbidden;

  const data = await request.json() as any;
  const { lesson_id, prompt_text, submission_type, max_score } = data;
  if (!lesson_id || !prompt_text) return errorResponse('Missing required fields', 400, request);

  if (!(await assertOwnsLesson(db, lesson_id, user.id))) return errorResponse('Lesson not found or not owned by you', 404, request);

  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO academy_assignments (id, lesson_id, prompt_text, submission_type, max_score)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, lesson_id, prompt_text, submission_type || 'text', max_score ?? 100).run();

  return corsResponse({ success: true, id }, 200, request);
};
