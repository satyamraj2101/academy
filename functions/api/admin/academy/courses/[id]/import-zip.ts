import JSZip from 'jszip';
import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../../../middleware';

interface Env {
  DB?: D1Database;
  ASSETS_BUCKET?: R2Bucket;
  ADMIN_JWT_AUDIENCE?: string;
  ENV?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
const VIDEO_EXT = ['mp4', 'webm', 'mov', 'm4v'];
const PPT_EXT = ['ppt', 'pptx', 'pdf'];

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/x-m4v',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
};

// Parses "3_Module Title", "03 - Module Title", "3.Module Title" etc into { order, name }.
function parsePrefixed(raw: string): { order: number; name: string } {
  const match = raw.match(/^(\d+)[\s._-]*(.*)$/);
  if (match) {
    return { order: parseInt(match[1], 10), name: match[2].trim() || raw };
  }
  return { order: Number.MAX_SAFE_INTEGER, name: raw };
}

function extOf(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

interface PendingSection {
  order: number;
  section_type: 'markdown' | 'image' | 'video' | 'ppt' | 'quiz' | 'assignment';
  content: string;
  is_mandatory: boolean;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;

  if (!hasPermission(context.admin, 'academy')) {
    return errorResponse('Forbidden — insufficient permissions', 403);
  }

  const { db, admin } = context;
  const courseId = params.id as string;
  if (!courseId) return errorResponse('Missing course id', 400);

  if (!env.ASSETS_BUCKET) return errorResponse('R2 bucket not configured', 500);

  const course = await db.prepare('SELECT id FROM academy_courses WHERE id = ?').bind(courseId).first();
  if (!course) return errorResponse('Course not found', 404);

  let zip: JSZip;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return errorResponse('No zip file provided', 400);
    const buf = await file.arrayBuffer();
    zip = await JSZip.loadAsync(buf);
  } catch (err: any) {
    console.error('Failed to parse zip:', err);
    return errorResponse('Could not read the uploaded file as a zip archive', 400);
  }

  const warnings: string[] = [];
  const now = new Date().toISOString();

  // Group entries by their path segments, ignoring directory-only entries and macOS junk.
  const entries = Object.values(zip.files).filter(f => !f.dir && !f.name.includes('__MACOSX') && !f.name.split('/').pop()?.startsWith('.'));

  // path -> segments (module, lesson, file)
  type Entry = { path: string; segments: string[]; zipObj: JSZip.JSZipObject };
  const parsed: Entry[] = entries.map(f => ({ path: f.name, segments: f.name.split('/').filter(Boolean), zipObj: f }));

  // Only consider entries at least 2 levels deep (module/lesson/file); ignore root-level loose files.
  const nested = parsed.filter(e => e.segments.length >= 3);
  if (nested.length === 0) {
    return errorResponse('No module/lesson folders found. Expected a structure like "1_Module Name/1_Lesson Name/1_content.md".', 400);
  }

  const moduleGroups = new Map<string, Entry[]>();
  for (const e of nested) {
    const moduleKey = e.segments[0];
    if (!moduleGroups.has(moduleKey)) moduleGroups.set(moduleKey, []);
    moduleGroups.get(moduleKey)!.push(e);
  }

  const sortedModuleKeys = Array.from(moduleGroups.keys())
    .map(key => ({ key, ...parsePrefixed(key) }))
    .sort((a, b) => a.order - b.order);

  let modulesCreated = 0;
  let lessonsCreated = 0;
  let sectionsCreated = 0;

  const maxModuleOrderRow = await db.prepare('SELECT MAX(sort_order) as m FROM academy_modules WHERE course_id = ?').bind(courseId).first() as any;
  let nextModuleOrder = (maxModuleOrderRow?.m ?? 0) + 1;

  for (const modInfo of sortedModuleKeys) {
    const moduleEntries = moduleGroups.get(modInfo.key)!;
    const moduleId = crypto.randomUUID();

    await db.prepare(`
      INSERT INTO academy_modules (id, course_id, title, description, sort_order, is_published)
      VALUES (?, ?, ?, ?, ?, 1)
    `).bind(moduleId, courseId, modInfo.name || `Module ${modInfo.order}`, '', nextModuleOrder++).run();
    modulesCreated++;

    const lessonGroups = new Map<string, Entry[]>();
    for (const e of moduleEntries) {
      const lessonKey = e.segments[1];
      if (!lessonGroups.has(lessonKey)) lessonGroups.set(lessonKey, []);
      lessonGroups.get(lessonKey)!.push(e);
    }

    const sortedLessonKeys = Array.from(lessonGroups.keys())
      .map(key => ({ key, ...parsePrefixed(key) }))
      .sort((a, b) => a.order - b.order);

    let nextLessonOrder = 1;

    for (const lessonInfo of sortedLessonKeys) {
      const lessonEntries = lessonGroups.get(lessonInfo.key)!.filter(e => e.segments.length === 3);
      const lessonId = crypto.randomUUID();

      await db.prepare(`
        INSERT INTO academy_lessons (id, module_id, title, content_type, sort_order, is_preview, is_published)
        VALUES (?, ?, ?, 'blocks', ?, 0, 1)
      `).bind(lessonId, moduleId, lessonInfo.name || `Lesson ${lessonInfo.order}`, nextLessonOrder++).run();
      lessonsCreated++;

      const fileInfos = lessonEntries
        .map(e => ({ ...parsePrefixed(e.segments[2]), entry: e }))
        .sort((a, b) => a.order - b.order);

      const sections: PendingSection[] = [];
      let order = 1;

      for (const f of fileInfos) {
        const filename = f.entry.segments[2];
        const ext = extOf(filename);
        const baseNameLower = filename.toLowerCase();

        try {
          if (ext === 'md' || ext === 'markdown') {
            const text = await f.entry.zipObj.async('text');
            sections.push({ order: order++, section_type: 'markdown', content: text, is_mandatory: true });
          } else if (baseNameLower.includes('quiz') && ext === 'json') {
            const json = JSON.parse(await f.entry.zipObj.async('text'));
            const quizId = crypto.randomUUID();
            await db.prepare(`
              INSERT INTO academy_quizzes (id, course_id, module_id, title, passing_score, max_attempts, time_limit_minutes, is_certification_exam)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              quizId, courseId, moduleId, json.title || 'Imported Quiz',
              json.passing_score ?? 70, json.max_attempts ?? 3, json.time_limit_minutes ?? null,
              json.is_certification_exam ? 1 : 0
            ).run();
            const questions = Array.isArray(json.questions) ? json.questions : [];
            for (let i = 0; i < questions.length; i++) {
              const q = questions[i];
              await db.prepare(`
                INSERT INTO academy_quiz_questions (id, quiz_id, question_text, question_type, options, correct_answer, explanation, points, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(
                crypto.randomUUID(), quizId, q.question_text || '', q.question_type || 'mcq',
                JSON.stringify(q.options || []), q.correct_answer || '', q.explanation || null, q.points ?? 1, i + 1
              ).run();
            }
            sections.push({ order: order++, section_type: 'quiz', content: JSON.stringify({ quizId }), is_mandatory: true });
          } else if (baseNameLower.includes('assignment') && ext === 'json') {
            const json = JSON.parse(await f.entry.zipObj.async('text'));
            const assignmentId = crypto.randomUUID();
            await db.prepare(`
              INSERT INTO academy_assignments (id, lesson_id, prompt_text, submission_type, max_score, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `).bind(assignmentId, lessonId, json.prompt_text || '', json.submission_type || 'text', json.max_score ?? 100, now).run();
            sections.push({ order: order++, section_type: 'assignment', content: JSON.stringify({ assignmentId }), is_mandatory: true });
          } else if (IMAGE_EXT.includes(ext) || VIDEO_EXT.includes(ext) || PPT_EXT.includes(ext)) {
            const bytes = await f.entry.zipObj.async('uint8array');
            const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
            const key = `${crypto.randomUUID()}-${Date.now()}.${ext}`;
            await env.ASSETS_BUCKET!.put(key, bytes, { httpMetadata: { contentType } });
            const assetUrl = `/api/assets/${key}`;
            await db.prepare(`
              INSERT INTO academy_assets (id, instructor_id, file_name, file_type, file_size, url, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(crypto.randomUUID(), admin.id, filename, contentType, bytes.length, assetUrl, now).run();

            const sectionType = IMAGE_EXT.includes(ext) ? 'image' : VIDEO_EXT.includes(ext) ? 'video' : 'ppt';
            const absoluteUrl = new URL(assetUrl, request.url).toString();
            sections.push({ order: order++, section_type: sectionType, content: absoluteUrl, is_mandatory: false });
          } else if (ext === 'json' && baseNameLower.includes('lesson')) {
            // Reserved for rich lesson.json metadata in a future round-trip import; skip for now.
            continue;
          } else {
            warnings.push(`Skipped unrecognized file "${f.entry.path}"`);
          }
        } catch (err: any) {
          console.error('Failed to process zip entry', f.entry.path, err);
          warnings.push(`Failed to import "${f.entry.path}": ${err.message || 'unknown error'}`);
        }
      }

      if (sections.length > 0) {
        const statements = sections.map(s =>
          db.prepare(`
            INSERT INTO academy_lesson_sections (id, lesson_id, section_type, sort_order, content, is_mandatory, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(crypto.randomUUID(), lessonId, s.section_type, s.order, s.content, s.is_mandatory ? 1 : 0, now)
        );
        await db.batch(statements);
        sectionsCreated += sections.length;
      }
    }
  }

  await logAdminAction(db, admin.email, 'academy.course.import_zip', 'course', courseId, { modulesCreated, lessonsCreated, sectionsCreated }, request);

  return corsResponse({ success: true, modulesCreated, lessonsCreated, sectionsCreated, warnings });
};
