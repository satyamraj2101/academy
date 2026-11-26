import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../../../middleware';
import { replaceSections } from '../../_lessonVersions';

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

    // One place writes sections (and keeps the previous blocks as a version first).
    await replaceSections(db, lessonId, sections, admin.email, 'save');

    await logAdminAction(db, admin.email, 'academy.lesson.sections.replace', 'lesson', lessonId, { count: sections.length }, request);

    return corsResponse({ success: true, count: sections.length });
  } catch (err: any) {
    console.error('Failed to replace sections:', err);
    return errorResponse('Failed to save lesson content', 500);
  }
};
