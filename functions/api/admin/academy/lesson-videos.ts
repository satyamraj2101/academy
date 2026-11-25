import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';
import { buildVideoContent } from '../../academy/_interactiveVideo';

interface Env { DB?: D1Database }

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// POST { lessonId, video: { src, title, duration, stations, chapters, checkpoints }, replaceVideoId? }
// Appends an "interactive_video" section to the lesson (or swaps one for a new render). The section is mandatory: students
// must watch it and answer its questions before Mark Complete unlocks. Uses a single INSERT, so unlike the lesson editor's
// replace-all save it can never clobber other sections.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyAdminRequest(request, env);
  if ('error' in auth) return auth.error;
  const { admin, db } = auth.context;
  if (!hasPermission(admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  let body: any;
  try { body = await request.json(); } catch { return errorResponse('Invalid JSON body', 400); }
  const lessonId = String(body?.lessonId || '');
  if (!lessonId) return errorResponse('lessonId is required', 400);
  const lesson = await db.prepare('SELECT id FROM academy_lessons WHERE id = ?').bind(lessonId).first();
  if (!lesson) return errorResponse('Lesson not found', 404);

  const videoId = crypto.randomUUID();
  const built = buildVideoContent(body.video, videoId);
  if (!built.content) return errorResponse(built.error || 'Invalid video', 400);
  const json = JSON.stringify(built.content);
  if (json.length > 60_000) return errorResponse('Video metadata is too large', 413);

  const now = new Date().toISOString();
  let sectionId = crypto.randomUUID();
  const replaceId = body.replaceVideoId ? String(body.replaceVideoId) : null;
  if (replaceId) {
    const { results } = await db.prepare("SELECT id, content FROM academy_lesson_sections WHERE lesson_id = ? AND section_type = 'interactive_video'").bind(lessonId).all();
    const old = ((results || []) as any[]).find(r => { try { return JSON.parse(r.content).videoId === replaceId; } catch { return false; } });
    if (!old) return errorResponse('The video to replace was not found in this lesson', 404);
    sectionId = old.id;
    await db.prepare('UPDATE academy_lesson_sections SET content = ? WHERE id = ?').bind(json, sectionId).run();
  } else {
    const last = await db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS n FROM academy_lesson_sections WHERE lesson_id = ?').bind(lessonId).first() as any;
    await db.prepare(`INSERT INTO academy_lesson_sections (id, lesson_id, section_type, sort_order, content, is_mandatory, created_at) VALUES (?, ?, 'interactive_video', ?, ?, 1, ?)`)
      .bind(sectionId, lessonId, (last?.n || 0) + 1, json, now).run();
  }
  await logAdminAction(db, admin.email, replaceId ? 'academy.lesson_video.replace' : 'academy.lesson_video.publish', 'lesson', lessonId, { videoId, title: built.content.title, duration: built.content.duration, checkpoints: built.content.checkpoints.length }, request);
  return corsResponse({ success: true, sectionId, videoId }, 201);
};
