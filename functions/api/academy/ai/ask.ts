import { GoogleGenAI } from '@google/genai';
import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

interface GeneratedQuestion {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;
  const { user, db } = authResult.context;

  if (!env.GEMINI_API_KEY) {
    return errorResponse('GEMINI_API_KEY is not configured', 500, request);
  }

  let body: { question?: string; lessonId?: string; mode?: 'ask' | 'quiz_me'; numQuestions?: number };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400, request);
  }

  const { lessonId, mode = 'ask' } = body;
  if (!lessonId) return errorResponse('lessonId is required', 400, request);
  if (mode === 'ask' && !body.question?.trim()) return errorResponse('question is required', 400, request);

  // Student-facing AI calls are much higher-volume than admin authoring
  // calls — cap each student to 20 AI requests per 10 minutes, separate from
  // the general per-IP limiter in verifyAcademyUser.
  if (env.ENQUIRY_KV) {
    const limitKey = `academy:ai:rl:${user.id}`;
    const currentStr = await env.ENQUIRY_KV.get(limitKey);
    const current = currentStr ? parseInt(currentStr, 10) : 0;
    if (current >= 20) {
      return errorResponse("You've hit the AI tutor's usage limit for now — try again in a few minutes.", 429, request);
    }
    try {
      await env.ENQUIRY_KV.put(limitKey, (current + 1).toString(), { expirationTtl: 600 });
    } catch (e) { console.error('KV error', e); }
  }

  // Fetch the lesson server-side rather than trusting client-supplied
  // content — otherwise this endpoint is a free, unauthenticated proxy to
  // Gemini with arbitrary prompt injection.
  const lesson = await db.prepare(`
    SELECT l.id, l.title, l.content_body, m.course_id, m.title as module_title, c.title as course_title, l.is_preview
    FROM academy_lessons l
    JOIN academy_modules m ON l.module_id = m.id
    JOIN academy_courses c ON m.course_id = c.id
    WHERE l.id = ?
  `).bind(lessonId).first() as any;
  if (!lesson) return errorResponse('Lesson not found', 404, request);

  if (!lesson.is_preview) {
    const enrollment = await db.prepare('SELECT id FROM academy_enrollments WHERE user_id = ? AND course_id = ? AND status = "active"')
      .bind(user.id, lesson.course_id).first();
    if (!enrollment) return errorResponse('Not enrolled in this course', 403, request);
  }

  const { results: sections } = await db.prepare(`
    SELECT section_type, content FROM academy_lesson_sections WHERE lesson_id = ? ORDER BY sort_order ASC
  `).bind(lessonId).all();

  const lessonText = ((sections as any[]) || [])
    .filter(s => s.section_type === 'markdown')
    .map(s => s.content)
    .join('\n\n') || lesson.content_body || '';

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  if (mode === 'quiz_me') {
    const numQuestions = Math.min(Math.max(Number(body.numQuestions) || 3, 1), 5);
    const prompt = `You are an AI tutor for SpotCLM Academy generating an ungraded practice quiz for a student reviewing this lesson.

Course: ${lesson.course_title}
Module: ${lesson.module_title}
Lesson: ${lesson.title}
Lesson content:
${lessonText.slice(0, 6000) || 'No content available — generate general questions about the lesson title/topic.'}

Generate exactly ${numQuestions} multiple-choice practice questions (4 options each) testing understanding of this specific lesson. Return ONLY a valid JSON object:
{ "questions": [ { "question_text": "...", "options": ["...", "...", "...", "..."], "correct_answer": "must exactly match one option", "explanation": "one sentence" } ] }`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      const parsed = JSON.parse(response.text || '{}') as { questions: GeneratedQuestion[] };
      // Explicitly untracked practice — no academy_quiz_attempts row is
      // written, so this never affects real quiz stats or gamification.
      return corsResponse({ success: true, questions: parsed.questions || [] }, 200, request);
    } catch (err: any) {
      console.error('AI quiz-me error:', err);
      return errorResponse('Failed to generate practice questions', 500, request);
    }
  }

  const prompt = `You are a Socratic AI Tutor for an e-learning platform called SpotCLM Academy.
You are helping a student with the following lesson:
Course: ${lesson.course_title}
Module: ${lesson.module_title}
Lesson: ${lesson.title}
Lesson Content (context): ${lessonText.slice(0, 5000) || 'None provided'}

The student asks: "${body.question}"

Please provide a helpful, encouraging response grounded in the lesson content above. Do not give direct answers to quizzes or exact solutions if they should figure it out. Instead, guide them Socratically with hints and probing questions. Format your response cleanly.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return new Response(JSON.stringify({ answer: response.text }), { status: 200, headers: CORS_HEADERS });
  } catch (err: any) {
    console.error('AI ask error:', err);
    return errorResponse('Failed to contact the AI tutor', 500, request);
  }
};
