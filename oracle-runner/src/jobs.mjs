// The course pipeline: (prompt | document | transcript) -> outline -> full lesson content -> draft course.
// All three modes share one assembler. The existing synchronous endpoint only produced lesson stubs
// ("draft this in AI Studio"); the runner writes real lesson bodies, which is what makes a course usable.
import { api, patchJob } from './api.mjs';
import { generateJson, generateText } from './gemini.mjs';
import { fetchSource, toText, cleanTranscript } from './parse.mjs';

const OUTLINE_SHAPE = `{
  "title": "a compelling course title",
  "description": "a 1-2 sentence catalog description",
  "level": "Beginner|Intermediate|Advanced|Expert",
  "category": "a short category label",
  "modules": [{
    "title": "module title", "description": "one sentence",
    "lessons": [{ "title": "lesson title", "summary": "one sentence on what this lesson covers" }],
    "quiz": { "title": "quiz title", "passing_score": 70, "questions": [
      { "question_text": "...", "options": ["...", "...", "...", "..."], "correct_answer": "must exactly match one option", "explanation": "one sentence" } ] },
    "assignment": { "prompt_text": "what the student must do and submit", "submission_type": "text|file|both", "max_score": 100 }
  }]
}`;

const RULES = `Rules: no "Module 1:" / "Lesson 2:" prefixes in titles (the platform numbers them). Each module has 1-3 lessons, a 3-5 question multiple-choice quiz, and one graded assignment. Return ONLY valid JSON of this shape:\n${OUTLINE_SHAPE}`;

function outlinePrompt(type, payload, source) {
  const n = Math.min(Math.max(Number(payload.numModules) || 4, 2), 10);
  const context = `You are the lead instructional designer for SpotCLM Academy, a professional Contract Lifecycle Management (CLM) training platform.`;
  const common = `Audience: ${payload.audience || 'working professionals'}. Level: ${payload.level || 'Beginner'}. ${payload.goal ? `Learning goal: ${payload.goal}.` : ''} Target duration: ${payload.duration || '4 weeks'}. ${payload.tone ? `Tone: ${payload.tone}.` : ''} Design exactly ${n} modules, foundational to advanced.`;
  if (type === 'course_from_prompt') return `${context}\nDesign a complete course on: ${payload.topic}.\n${common}\n${RULES}`;
  if (type === 'course_from_document') {
    return `${context}\nDesign a course that teaches the material in the SOURCE DOCUMENT below. Structure it for learning rather than copying its layout, and cover its key points.${payload.topic ? ` Focus: ${payload.topic}.` : ''}\n${common}\n${RULES}\n\nSOURCE DOCUMENT:\n${source}`;
  }
  return `${context}\nBelow is a transcript of an expert teaching. Turn it into a structured course: group related ideas into modules and lessons, keep the expert's examples and terminology, and drop filler and repetition.${payload.topic ? ` Focus: ${payload.topic}.` : ''}\n${common}\n${RULES}\n\nTRANSCRIPT:\n${source}`;
}

function lessonPrompt(course, mod, lesson, source) {
  return `You are writing one lesson of the course "${course.title}" (${course.level}) for SpotCLM Academy, a professional Contract Lifecycle Management training platform.
Module: ${mod.title} — ${mod.description}
Lesson: ${lesson.title}
Covers: ${lesson.summary}

Write the full lesson in Markdown, 600-900 words: a short intro stating what the learner will be able to do, 3-5 sections with ## headings, a concrete worked example or realistic scenario, and a "Key takeaways" list at the end. Practical and specific, no filler, no title heading (the platform shows it), and do not mention that you are an AI.${source ? `\n\nGround every factual claim in the SOURCE below. Do not invent facts, figures or policies that it does not support.\n\nSOURCE:\n${source}` : ''}`;
}

const stripNumbering = (s) => (typeof s === 'string' ? s.replace(/^(module|lesson)\s*\d+\s*[:.\-]\s*/i, '').trim() : s);

function validateOutline(o) {
  if (!o || typeof o.title !== 'string' || !Array.isArray(o.modules) || o.modules.length === 0) throw new Error('Outline is missing title or modules');
  o.modules = o.modules.map(m => ({
    ...m,
    title: stripNumbering(m.title),
    lessons: (Array.isArray(m.lessons) ? m.lessons : []).map(l => ({ ...l, title: stripNumbering(l.title) })),
  })).filter(m => m.lessons.length > 0);
  if (!o.modules.length) throw new Error('Outline has no lessons');
  // A quiz whose answer isn't one of its options can never be passed — drop those questions.
  for (const m of o.modules) {
    if (m.quiz) m.quiz.questions = (m.quiz.questions || []).filter(q => Array.isArray(q.options) && q.options.includes(q.correct_answer));
  }
  return o;
}

export async function runJob(job, report) {
  const p = job.payload || {};
  report.setStep('Reading source');

  // The admin API has no course delete, so a retried job can't clean up a half-built draft. Record it
  // in the result instead so the admin can remove it manually.
  const abandonedDraft = job.progress?.course_id || null;

  let source = '';
  if (job.type === 'course_from_document') source = await toText(await fetchSource(p));
  else if (job.type === 'course_from_transcript') source = cleanTranscript(await toText(await fetchSource(p)));
  else if (!p.topic) throw new Error('course_from_prompt needs a topic');

  report.setStep('Designing outline');
  const outline = validateOutline(await generateJson(outlinePrompt(job.type, p, source)));
  const totalLessons = outline.modules.reduce((n, m) => n + m.lessons.length, 0);
  report.set({ total: totalLessons, done: 0 });

  const course = await api('/academy/courses', {
    method: 'POST',
    body: {
      title: outline.title, description: outline.description, level: outline.level, duration: p.duration || '',
      category: outline.category, status: 'draft',
      price_usd: Math.round((Number(p.price_usd) || 0) * 100), price_inr: Math.round((Number(p.price_inr) || 0) * 100),
    },
  });
  report.set({ course_id: course.id });

  const stats = { modules: 0, lessons: 0, quizzes: 0, assignments: 0 };
  for (const mod of outline.modules) {
    const modRes = await api('/academy/modules', { method: 'POST', body: { course_id: course.id, title: mod.title, description: mod.description } });
    stats.modules++;

    let lastLesson = null; // quiz + assignment hang off the module's last lesson
    for (const lesson of mod.lessons) {
      report.setStep(`Writing lesson: ${lesson.title}`);
      const body = (await generateText(lessonPrompt(outline, mod, lesson, job.type === 'course_from_prompt' ? '' : source))).trim();
      const lessonRes = await api('/academy/lessons', { method: 'POST', body: { module_id: modRes.id, title: lesson.title, content_type: 'blocks' } });
      const sections = [{ section_type: 'markdown', content: body, is_mandatory: true }];
      lastLesson = { id: lessonRes.id, sections };
      stats.lessons++;
      report.set({ done: stats.lessons });
      if (lesson !== mod.lessons[mod.lessons.length - 1]) {
        await api(`/academy/lessons/${lessonRes.id}/sections`, { method: 'PUT', body: { sections } });
      }
    }

    if (mod.quiz?.questions?.length) {
      const quiz = await api('/academy/quizzes', { method: 'POST', body: { course_id: course.id, module_id: modRes.id, title: mod.quiz.title, passing_score: mod.quiz.passing_score || 70, max_attempts: 3 } });
      for (const q of mod.quiz.questions) {
        await api('/academy/quiz-questions', { method: 'POST', body: { quiz_id: quiz.id, question_text: q.question_text, question_type: 'mcq', options: q.options, correct_answer: q.correct_answer, explanation: q.explanation, points: 1 } });
      }
      lastLesson.sections.push({ section_type: 'quiz', content: JSON.stringify({ quizId: quiz.id }), is_mandatory: true });
      stats.quizzes++;
    }
    if (mod.assignment?.prompt_text) {
      const a = await api('/academy/assignments', { method: 'POST', body: { lesson_id: lastLesson.id, prompt_text: mod.assignment.prompt_text, submission_type: mod.assignment.submission_type || 'text', max_score: mod.assignment.max_score || 100 } });
      lastLesson.sections.push({ section_type: 'assignment', content: JSON.stringify({ assignmentId: a.id }), is_mandatory: true });
      stats.assignments++;
    }
    await api(`/academy/lessons/${lastLesson.id}/sections`, { method: 'PUT', body: { sections: lastLesson.sections } });
  }

  return { course_id: course.id, title: outline.title, ...stats, ...(abandonedDraft ? { abandoned_draft_course_id: abandonedDraft } : {}), note: 'Created as a draft. Review it in the admin Course Builder before publishing.' };
}
