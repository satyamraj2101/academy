import { Env, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';
import { parseVideoContent, normaliseRanges, mergeRanges, gradeAnswers, evaluate, plausibleWatched, watchedSeconds, type GradedAnswers, type Range, type VideoContent } from '../_interactiveVideo';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

const j = <T,>(s: string | null | undefined, fallback: T): T => { try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } };

// All interactive videos in a lesson, with the course they belong to.
async function lessonVideos(db: D1Database, lessonId: string) {
  const lesson = await db.prepare('SELECT m.course_id FROM academy_lessons l JOIN academy_modules m ON l.module_id = m.id WHERE l.id = ?').bind(lessonId).first() as any;
  if (!lesson) return null;
  const { results } = await db.prepare("SELECT content, is_mandatory FROM academy_lesson_sections WHERE lesson_id = ? AND section_type = 'interactive_video'").bind(lessonId).all();
  const videos = ((results || []) as any[]).map(r => ({ content: parseVideoContent(r.content), mandatory: !!r.is_mandatory })).filter((v): v is { content: VideoContent; mandatory: boolean } => !!v.content);
  return { courseId: lesson.course_id as string, videos };
}

const stateOf = (content: VideoContent, row: any | null) => {
  const ranges = j<Range[]>(row?.watched, []), answers = j<GradedAnswers>(row?.answers, {});
  return { videoId: content.videoId, position: row?.position ?? 0, watched: ranges, answers, ...evaluate(content, ranges, answers), completed: !!row?.completed };
};

// GET ?lessonId=...[&videoId=...] -> progress for every interactive video in the lesson (or one).
// A student who is not enrolled (e.g. watching a free preview) gets tracking:false and simply is not tracked.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyAcademyUser(request, env);
  if ('error' in auth) return auth.error;
  const { user, db } = auth.context;
  const url = new URL(request.url), lessonId = url.searchParams.get('lessonId'), videoId = url.searchParams.get('videoId');
  if (!lessonId) return errorResponse('lessonId is required', 400);
  const info = await lessonVideos(db, lessonId);
  if (!info) return errorResponse('Lesson not found', 404);
  const enrolled = await db.prepare('SELECT id FROM academy_enrollments WHERE user_id = ? AND course_id = ?').bind(user.id, info.courseId).first();
  if (!enrolled) return corsResponse({ tracking: false, videos: [] });
  const { results } = await db.prepare('SELECT * FROM academy_video_progress WHERE user_id = ? AND lesson_id = ?').bind(user.id, lessonId).all();
  const rows = new Map(((results || []) as any[]).map(r => [r.video_id, r]));
  const videos = info.videos.filter(v => !videoId || v.content.videoId === videoId).map(v => ({ ...stateOf(v.content, rows.get(v.content.videoId) || null), mandatory: v.mandatory }));
  return corsResponse({ tracking: true, videos });
};

// POST { lessonId, videoId, position, watched: [[start,end],...], answers: { sceneId: optionIndex } }
// The client reports; the server decides. Watched time is merged and bounded by real time, answers are graded here.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyAcademyUser(request, env);
  if ('error' in auth) return auth.error;
  const { user, db } = auth.context;
  let body: any;
  try { body = await request.json(); } catch { return errorResponse('Invalid JSON body', 400); }
  const { lessonId, videoId } = body || {};
  if (!lessonId || !videoId) return errorResponse('lessonId and videoId are required', 400);

  const info = await lessonVideos(db, String(lessonId));
  if (!info) return errorResponse('Lesson not found', 404);
  const video = info.videos.find(v => v.content.videoId === videoId);
  if (!video) return errorResponse('Video not found in this lesson', 404);
  const enrolled = await db.prepare('SELECT id FROM academy_enrollments WHERE user_id = ? AND course_id = ?').bind(user.id, info.courseId).first();
  if (!enrolled) return errorResponse('Not enrolled', 403);

  const content = video.content;
  const prior = await db.prepare('SELECT * FROM academy_video_progress WHERE user_id = ? AND video_id = ?').bind(user.id, videoId).first() as any;
  const now = new Date();
  const priorRanges = j<Range[]>(prior?.watched, []);
  const merged = mergeRanges(priorRanges, normaliseRanges(body.watched, content.duration), content.duration);
  const sinceFirst = prior ? now.getTime() - new Date(prior.created_at).getTime() : 0;
  if (!plausibleWatched(watchedSeconds(merged), sinceFirst)) return errorResponse('That progress update does not add up', 422);

  const answers = gradeAnswers(content, body.answers, j<GradedAnswers>(prior?.answers, {}));
  const result = evaluate(content, merged, answers);
  const position = Number.isFinite(Number(body.position)) ? Math.max(0, Math.min(content.duration, Number(body.position))) : prior?.position ?? 0;
  const wasCompleted = !!prior?.completed, completed = wasCompleted || result.completed;
  const iso = now.toISOString();

  await db.prepare(`
    INSERT INTO academy_video_progress (id, user_id, lesson_id, video_id, position, watched, answers, completed, completed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, video_id) DO UPDATE SET position = excluded.position, watched = excluded.watched, answers = excluded.answers,
      completed = excluded.completed, completed_at = COALESCE(academy_video_progress.completed_at, excluded.completed_at), updated_at = excluded.updated_at
  `).bind(crypto.randomUUID(), user.id, String(lessonId), String(videoId), position, JSON.stringify(merged), JSON.stringify(answers), completed ? 1 : 0, completed ? iso : null, iso, iso).run();

  return corsResponse({ success: true, ...stateOf(content, { position, watched: JSON.stringify(merged), answers: JSON.stringify(answers), completed }), newlyCompleted: completed && !wasCompleted });
};
