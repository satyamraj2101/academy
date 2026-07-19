import JSZip from 'jszip';
import { adminFetch } from '../hooks/useD1Query';

function slugFolder(order: number, name: string): string {
  const clean = (name || 'untitled').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 60);
  return `${order}_${clean}`;
}

async function fetchAsBlob(url: string): Promise<{ blob: Blob; ext: string } | null> {
  try {
    const absolute = url.startsWith('http') ? url : window.location.origin + url;
    const res = await fetch(absolute);
    if (!res.ok) return null;
    const blob = await res.blob();
    const extMatch = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return { blob, ext: extMatch ? extMatch[1] : 'bin' };
  } catch {
    return null;
  }
}

/** Downloads a full course (metadata, curriculum, quizzes, assignments, and referenced assets) as a zip. */
export async function exportCourseZip(courseId: string, courseTitle: string, onProgress?: (msg: string) => void) {
  onProgress?.('Fetching course structure...');
  const structureRes = await adminFetch(`/academy/courses/${courseId}/structure`) as {
    success: boolean;
    course: any;
    structure: Array<{ id: string; title: string; description: string; lessons: Array<{ id: string; title: string; content_type: string; is_preview: number; sections: Array<{ id: string; section_type: string; content: string; sort_order: number; is_mandatory: number }> }> }>;
  };

  if (!structureRes.success) throw new Error('Failed to load course structure');

  const zip = new JSZip();
  zip.file('course.json', JSON.stringify(structureRes.course, null, 2));

  const modules = [...structureRes.structure].sort((a: any, b: any) => a.sort_order - b.sort_order);

  for (let mi = 0; mi < modules.length; mi++) {
    const mod = modules[mi] as any;
    const modFolder = zip.folder(slugFolder(mi + 1, mod.title))!;
    modFolder.file('module.json', JSON.stringify({ title: mod.title, description: mod.description }, null, 2));

    const lessons = [...(mod.lessons || [])].sort((a: any, b: any) => a.sort_order - b.sort_order);

    for (let li = 0; li < lessons.length; li++) {
      const lesson = lessons[li];
      onProgress?.(`Packing "${lesson.title}"...`);
      const lessonFolder = modFolder.folder(slugFolder(li + 1, lesson.title))!;

      const sections = [...(lesson.sections || [])].sort((a, b) => a.sort_order - b.sort_order);
      const lessonMeta: any = { title: lesson.title, content_type: lesson.content_type, is_preview: !!lesson.is_preview, sections: [] };

      for (let si = 0; si < sections.length; si++) {
        const section = sections[si];
        const order = si + 1;
        const entryMeta: any = { type: section.section_type, mandatory: !!section.is_mandatory };

        if (section.section_type === 'markdown') {
          lessonFolder.file(`${order}_markdown.md`, section.content || '');
          entryMeta.file = `${order}_markdown.md`;
        } else if (section.section_type === 'image' || section.section_type === 'video' || section.section_type === 'ppt') {
          const fetched = await fetchAsBlob(section.content);
          if (fetched) {
            const name = `${order}_${section.section_type}.${fetched.ext}`;
            lessonFolder.file(name, fetched.blob);
            entryMeta.file = name;
          } else {
            entryMeta.url = section.content;
          }
        } else if (section.section_type === 'quiz') {
          let quizId = '';
          try { quizId = JSON.parse(section.content || '{}').quizId; } catch { /* ignore */ }
          if (quizId) {
            const quizRes = await adminFetch(`/academy/quizzes?id=${quizId}`) as { success: boolean; quiz: any; questions: any[] };
            if (quizRes.success) {
              const name = `${order}_quiz.json`;
              lessonFolder.file(name, JSON.stringify({
                title: quizRes.quiz.title,
                passing_score: quizRes.quiz.passing_score,
                max_attempts: quizRes.quiz.max_attempts,
                time_limit_minutes: quizRes.quiz.time_limit_minutes,
                is_certification_exam: !!quizRes.quiz.is_certification_exam,
                questions: quizRes.questions.map((q: any) => ({
                  question_text: q.question_text,
                  question_type: q.question_type,
                  options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
                  correct_answer: q.correct_answer,
                  explanation: q.explanation,
                  points: q.points,
                })),
              }, null, 2));
              entryMeta.file = name;
            }
          }
        } else if (section.section_type === 'assignment') {
          let assignmentId = '';
          try { assignmentId = JSON.parse(section.content || '{}').assignmentId; } catch { /* ignore */ }
          if (assignmentId) {
            const assignRes = await adminFetch(`/academy/assignments?lessonId=${lesson.id}`) as { success: boolean; assignments: any[] };
            const match = assignRes.assignments?.find((a: any) => a.id === assignmentId) || assignRes.assignments?.[0];
            if (match) {
              const name = `${order}_assignment.json`;
              lessonFolder.file(name, JSON.stringify({
                prompt_text: match.prompt_text,
                submission_type: match.submission_type,
                max_score: match.max_score,
              }, null, 2));
              entryMeta.file = name;
            }
          }
        }

        lessonMeta.sections.push(entryMeta);
      }

      lessonFolder.file('lesson.json', JSON.stringify(lessonMeta, null, 2));
    }
  }

  onProgress?.('Compressing zip...');
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

  const safeTitle = (courseTitle || 'course').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 60);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeTitle}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
