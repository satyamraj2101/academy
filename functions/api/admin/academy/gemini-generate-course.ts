import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';

interface Env {
  DB?: D1Database;
  GEMINI_API_KEY?: string;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

interface Brief {
  topic: string;
  audience: string;
  level: string;
  goal: string;
  numModules: number;
  duration: string;
  tone?: string;
  model?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;

  if (!hasPermission(context.admin, 'academy')) {
    return errorResponse('Forbidden — insufficient permissions', 403);
  }

  const { db, admin } = context;

  if (!env.GEMINI_API_KEY) {
    return errorResponse('GEMINI_API_KEY is not configured on the server.', 500);
  }

  let body: Brief;
  try {
    body = await request.json() as Brief;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const required: (keyof Brief)[] = ['topic', 'audience', 'level', 'goal', 'numModules', 'duration'];
  const missing = required.filter(k => !body[k]);
  if (missing.length > 0) return errorResponse(`Missing required field(s): ${missing.join(', ')}`, 400);

  const numModules = Math.min(Math.max(Number(body.numModules) || 4, 2), 10);
  const model = body.model && /^[a-z0-9.\-]+$/i.test(body.model) ? body.model : 'gemini-2.5-flash';

  const prompt = `You are the lead instructional designer for SpotCLM Academy, a professional Contract Lifecycle Management (CLM) training platform. Design a complete course outline from this brief:

- Topic: ${body.topic}
- Target audience: ${body.audience}
- Level: ${body.level}
- Primary learning goal / outcome: ${body.goal}
- Desired number of modules: ${numModules}
- Target duration: ${body.duration}
${body.tone ? `- Tone/style: ${body.tone}` : ''}

Design exactly ${numModules} modules that build logically from foundational to advanced. Each module should have 1-3 lessons with clear, specific titles (not generic placeholders) and a one-sentence summary of what each lesson covers. Each module also needs a short knowledge-check quiz (3-5 multiple-choice questions covering that module's lessons) and one graded assignment that has students apply what the module taught.

IMPORTANT: Do NOT prefix module or lesson titles with numbering like "Module 1:" or "Lesson 2:" — the platform already numbers them automatically. Just write the descriptive title itself (e.g. "Understanding the Foundation of NDAs", not "Module 1: Understanding the Foundation of NDAs").

Return ONLY a valid JSON object matching this structure:
{
  "title": "a compelling course title",
  "description": "a 1-2 sentence course description for the catalog",
  "level": "Beginner|Intermediate|Advanced|Expert",
  "category": "a short category label",
  "modules": [
    {
      "title": "module title",
      "description": "one sentence module summary",
      "lessons": [
        { "title": "lesson title", "summary": "one sentence describing this lesson's content" }
      ],
      "quiz": {
        "title": "quiz title",
        "passing_score": 70,
        "questions": [
          { "question_text": "...", "options": ["...", "...", "...", "..."], "correct_answer": "must exactly match one of the options", "explanation": "one sentence" }
        ]
      },
      "assignment": {
        "prompt_text": "what the student must do and submit",
        "submission_type": "text|file|both",
        "max_score": 100
      }
    }
  ]
}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: 'application/json' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error:', errText);
      return errorResponse('Failed to contact Gemini API. The selected model may be unavailable — try a different one.', 502);
    }

    const geminiData = await response.json() as any;
    const textResponse = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) return errorResponse('Invalid response from Gemini API', 500);

    const parsed = JSON.parse(textResponse);

    const stripNumbering = (s: string) => typeof s === 'string' ? s.replace(/^(module|lesson)\s*\d+\s*[:.\-]\s*/i, '').trim() : s;
    if (Array.isArray(parsed.modules)) {
      parsed.modules = parsed.modules.map((m: any) => ({
        ...m,
        title: stripNumbering(m.title),
        lessons: Array.isArray(m.lessons) ? m.lessons.map((l: any) => ({ ...l, title: stripNumbering(l.title) })) : m.lessons,
      }));
    }

    await logAdminAction(db, admin.email, 'academy.gemini_generate_course', 'gemini', 'course_outline', { topic: body.topic, model }, request);

    return corsResponse({ success: true, ...parsed });
  } catch (err: any) {
    console.error('Gemini Generate Course Endpoint Error:', err);
    return errorResponse('Internal server error during course outline generation', 500);
  }
};
