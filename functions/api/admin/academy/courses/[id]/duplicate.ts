import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../../../middleware';

interface Env {
  DB?: D1Database;
  ADMIN_JWT_AUDIENCE?: string;
  ENV?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
}

// Deep-copies a course: modules, lessons, content sections, and every quiz
// (with its questions) or assignment referenced by a section — all in one
// D1 batch so the copy either fully succeeds or fully fails, never partial.
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;

  if (!hasPermission(context.admin, 'academy')) {
    return errorResponse('Forbidden — insufficient permissions', 403);
  }

  const { db, admin } = context;
  const sourceCourseId = params.id as string;
  if (!sourceCourseId) return errorResponse('Missing course id', 400);

  const course = await db.prepare('SELECT * FROM academy_courses WHERE id = ?').bind(sourceCourseId).first() as any;
  if (!course) return errorResponse('Course not found', 404);

  const { results: modules } = await db.prepare('SELECT * FROM academy_modules WHERE course_id = ? ORDER BY sort_order ASC').bind(sourceCourseId).all() as any;
  const { results: lessons } = await db.prepare(`
    SELECT * FROM academy_lessons WHERE module_id IN (SELECT id FROM academy_modules WHERE course_id = ?) ORDER BY sort_order ASC
  `).bind(sourceCourseId).all() as any;
  const { results: sections } = await db.prepare(`
    SELECT * FROM academy_lesson_sections WHERE lesson_id IN (
      SELECT id FROM academy_lessons WHERE module_id IN (SELECT id FROM academy_modules WHERE course_id = ?)
    ) ORDER BY sort_order ASC
  `).bind(sourceCourseId).all() as any;
  const { results: quizzes } = await db.prepare('SELECT * FROM academy_quizzes WHERE course_id = ?').bind(sourceCourseId).all() as any;
  const quizIds = (quizzes as any[]).map(q => q.id);
  let quizQuestions: any[] = [];
  if (quizIds.length > 0) {
    const placeholders = quizIds.map(() => '?').join(',');
    const { results } = await db.prepare(`SELECT * FROM academy_quiz_questions WHERE quiz_id IN (${placeholders}) ORDER BY sort_order ASC`).bind(...quizIds).all() as any;
    quizQuestions = results as any[];
  }
  const { results: assignments } = await db.prepare(`
    SELECT * FROM academy_assignments WHERE lesson_id IN (
      SELECT id FROM academy_lessons WHERE module_id IN (SELECT id FROM academy_modules WHERE course_id = ?)
    )
  `).bind(sourceCourseId).all() as any;

  const newCourseId = crypto.randomUUID();
  const moduleIdMap = new Map<string, string>((modules as any[]).map(m => [m.id, crypto.randomUUID()]));
  const lessonIdMap = new Map<string, string>((lessons as any[]).map(l => [l.id, crypto.randomUUID()]));
  const quizIdMap = new Map<string, string>((quizzes as any[]).map(q => [q.id, crypto.randomUUID()]));
  const assignmentIdMap = new Map<string, string>((assignments as any[]).map(a => [a.id, crypto.randomUUID()]));

  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];

  statements.push(db.prepare(`
    INSERT INTO academy_courses (
      id, title, description, long_description, level, duration, price_usd, price_inr, category, status,
      subtitle, keywords, language_tags, banner_url, thumbnail_url, promo_card_url, passing_score_overall, grading_policy_json,
      has_certification, certification_name, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    newCourseId, `${course.title} (Copy)`, course.description || '', course.long_description || null, course.level || 'Beginner',
    course.duration || '', course.price_usd || 0, course.price_inr || 0, course.category || '',
    course.subtitle || null, course.keywords || null, course.language_tags || null, course.banner_url || null,
    course.thumbnail_url || null, course.promo_card_url || null, course.passing_score_overall ?? null, course.grading_policy_json || null,
    course.has_certification ?? 0, course.certification_name || null, now, now
  ));

  for (const m of modules as any[]) {
    statements.push(db.prepare(`
      INSERT INTO academy_modules (id, course_id, title, description, sort_order, is_published, drip_days, unlock_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(moduleIdMap.get(m.id), newCourseId, m.title, m.description || '', m.sort_order, m.is_published, m.drip_days ?? null, m.unlock_date || null));
  }

  for (const l of lessons as any[]) {
    statements.push(db.prepare(`
      INSERT INTO academy_lessons (id, module_id, title, content_type, content_body, video_url, video_duration_minutes, pdf_url, sort_order, is_preview, is_published, drip_days, unlock_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      lessonIdMap.get(l.id), moduleIdMap.get(l.module_id), l.title, l.content_type, l.content_body || null,
      l.video_url || null, l.video_duration_minutes || null, l.pdf_url || null, l.sort_order,
      l.is_preview, l.is_published, l.drip_days ?? null, l.unlock_date || null
    ));
  }

  for (const q of quizzes as any[]) {
    statements.push(db.prepare(`
      INSERT INTO academy_quizzes (id, course_id, module_id, title, passing_score, max_attempts, time_limit_minutes, is_certification_exam)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      quizIdMap.get(q.id), newCourseId, q.module_id ? moduleIdMap.get(q.module_id) : null, q.title,
      q.passing_score, q.max_attempts, q.time_limit_minutes ?? null, q.is_certification_exam
    ));
  }

  for (const qq of quizQuestions) {
    statements.push(db.prepare(`
      INSERT INTO academy_quiz_questions (id, quiz_id, question_text, question_type, options, correct_answer, explanation, points, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), quizIdMap.get(qq.quiz_id), qq.question_text, qq.question_type, qq.options,
      qq.correct_answer, qq.explanation || null, qq.points, qq.sort_order
    ));
  }

  for (const a of assignments as any[]) {
    statements.push(db.prepare(`
      INSERT INTO academy_assignments (id, lesson_id, prompt_text, submission_type, max_score)
      VALUES (?, ?, ?, ?, ?)
    `).bind(assignmentIdMap.get(a.id), lessonIdMap.get(a.lesson_id), a.prompt_text, a.submission_type, a.max_score));
  }

  for (const s of sections as any[]) {
    let content = s.content;
    if (s.section_type === 'quiz') {
      try {
        const parsed = JSON.parse(content || '{}');
        if (parsed.quizId && quizIdMap.has(parsed.quizId)) content = JSON.stringify({ ...parsed, quizId: quizIdMap.get(parsed.quizId) });
      } catch { /* leave content as-is if unparsable */ }
    } else if (s.section_type === 'assignment') {
      try {
        const parsed = JSON.parse(content || '{}');
        if (parsed.assignmentId && assignmentIdMap.has(parsed.assignmentId)) content = JSON.stringify({ ...parsed, assignmentId: assignmentIdMap.get(parsed.assignmentId) });
      } catch { /* leave content as-is if unparsable */ }
    }
    statements.push(db.prepare(`
      INSERT INTO academy_lesson_sections (id, lesson_id, section_type, sort_order, content, is_mandatory)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), lessonIdMap.get(s.lesson_id), s.section_type, s.sort_order, content, s.is_mandatory));
  }

  try {
    await db.batch(statements);
    await logAdminAction(db, admin.email, 'academy.course.duplicate', 'course', newCourseId, { sourceCourseId }, request);
    return corsResponse({
      success: true,
      id: newCourseId,
      modulesCopied: (modules as any[]).length,
      lessonsCopied: (lessons as any[]).length,
      quizzesCopied: (quizzes as any[]).length,
      assignmentsCopied: (assignments as any[]).length,
    });
  } catch (err: any) {
    console.error('Course duplication failed:', err);
    return errorResponse('Failed to duplicate course', 500);
  }
};

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();
