import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';
import { replaceSections } from './_lessonVersions';

interface Env { DB?: D1Database }

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// GET /lesson-versions?lessonId=<id>  -> the kept versions, newest first (without their content)
// GET /lesson-versions?id=<versionId> -> one version with its blocks, to preview
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyAdminRequest(request, env);
  if ('error' in auth) return auth.error;
  const { admin, db } = auth.context;
  if (!hasPermission(admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  const params = new URL(request.url).searchParams;
  const id = params.get('id');
  if (id) {
    const row = await db.prepare('SELECT id, lesson_id, created_at, created_by, reason, sections_json, summary FROM academy_lesson_versions WHERE id = ?').bind(id).first() as any;
    if (!row) return errorResponse('Version not found', 404);
    let sections: unknown = [];
    try { sections = JSON.parse(row.sections_json); } catch { /* unreadable */ }
    return corsResponse({ id: row.id, lesson_id: row.lesson_id, created_at: row.created_at, created_by: row.created_by, reason: row.reason, summary: row.summary, sections });
  }
  const lessonId = params.get('lessonId');
  if (!lessonId) return errorResponse('lessonId or id is required', 400);
  const { results } = await db.prepare('SELECT id, created_at, created_by, reason, summary FROM academy_lesson_versions WHERE lesson_id = ? ORDER BY created_at DESC LIMIT 20').bind(lessonId).all();
  return corsResponse(results || []);
};

// POST { versionId } puts that version back. The blocks being replaced are kept as a version first, so a restore can be undone too.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyAdminRequest(request, env);
  if ('error' in auth) return auth.error;
  const { admin, db } = auth.context;
  if (!hasPermission(admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  let body: any;
  try { body = await request.json(); } catch { return errorResponse('Invalid JSON body', 400); }
  const versionId = typeof body?.versionId === 'string' ? body.versionId : '';
  if (!versionId) return errorResponse('versionId is required', 400);
  const row = await db.prepare('SELECT lesson_id, sections_json FROM academy_lesson_versions WHERE id = ?').bind(versionId).first() as any;
  if (!row) return errorResponse('Version not found', 404);
  let sections: any[];
  try { sections = JSON.parse(row.sections_json); if (!Array.isArray(sections)) throw new Error('not a list'); } catch { return errorResponse('This version cannot be read', 422); }

  await replaceSections(db, row.lesson_id, sections, admin.email, 'restore');
  await logAdminAction(db, admin.email, 'academy.lesson.restore_version', 'lesson', row.lesson_id, { versionId }, request);
  const { results } = await db.prepare('SELECT id, section_type, content, sort_order, is_mandatory FROM academy_lesson_sections WHERE lesson_id = ? ORDER BY sort_order').bind(row.lesson_id).all();
  return corsResponse({ success: true, lessonId: row.lesson_id, sections: results || [] });
};
