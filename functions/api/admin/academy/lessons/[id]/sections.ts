import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../../../middleware';

interface Env {
  DB?: D1Database;
  ADMIN_JWT_AUDIENCE?: string;
  ENV?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// Replaces the entire set of sections for a lesson in one atomic batch —
// deletes the old rows and inserts the new list together, so re-saving a
// lesson's content can never duplicate sections (the previous save path
// only ever inserted, never cleared, so every save doubled the content).
export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;

  if (!hasPermission(context.admin, 'academy')) {
    return errorResponse('Forbidden — insufficient permissions', 403);
  }

  const { db, admin } = context;
  const lessonId = params.id as string;
  if (!lessonId) return errorResponse('Missing lesson id', 400);

  try {
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

    await logAdminAction(db, admin.email, 'academy.lesson.sections.replace', 'lesson', lessonId, { count: sections.length }, request);

    return corsResponse({ success: true, count: sections.length });
  } catch (err: any) {
    console.error('Failed to replace sections:', err);
    return errorResponse('Failed to save lesson content', 500);
  }
};
