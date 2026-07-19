import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';

interface Env {
  DB?: D1Database;
  GEMINI_API_KEY?: string;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

type Mode = 'lesson' | 'quiz' | 'assignment';

function buildPrompt(mode: Mode, topic: string, context: string, numQuestions: number): string {
  const common = `You are an instructional designer writing course content for a professional CLM (Contract Lifecycle Management) training platform called SpotCLM Academy. Write clearly, concretely, and for working professionals — no fluff.`;

  if (mode === 'lesson') {
    return `${common}

Write a complete lesson in Markdown for the topic: "${topic}".
${context ? `Additional context/instructions: ${context}` : ''}

Use headings, bold key terms, and at least one bullet or numbered list. Keep it focused (400-700 words). Do not include a title heading (the lesson title is shown separately by the platform) — start directly with the content.

Return ONLY a valid JSON object matching this structure:
{ "markdown": "the full lesson content in markdown" }`;
  }

  if (mode === 'quiz') {
    return `${common}

Write a multiple-choice quiz with exactly ${numQuestions} questions testing the topic: "${topic}".
${context ? `Additional context/instructions: ${context}` : ''}

Each question needs 4 plausible options with exactly one correct answer, and a one-sentence explanation of why the correct answer is right.

Return ONLY a valid JSON object matching this structure:
{
  "title": "a short quiz title",
  "passing_score": 70,
  "questions": [
    { "question_text": "...", "options": ["...", "...", "...", "..."], "correct_answer": "must exactly match one of the options", "explanation": "...", "points": 1 }
  ]
}`;
  }

  return `${common}

Write a graded assignment prompt for the topic: "${topic}".
${context ? `Additional context/instructions: ${context}` : ''}

The prompt should ask the learner to apply what they learned, not just recall it, and should be answerable in a short written response.

Return ONLY a valid JSON object matching this structure:
{ "prompt_text": "the assignment prompt, 2-4 sentences", "submission_type": "text", "max_score": 100 }`;
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

  let body: { mode: Mode; topic: string; context?: string; numQuestions?: number; model?: string };
  try {
    body = await request.json() as { mode: Mode; topic: string; context?: string; numQuestions?: number; model?: string };
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (!body.mode || !['lesson', 'quiz', 'assignment'].includes(body.mode)) return errorResponse('mode must be lesson, quiz, or assignment', 400);
  if (!body.topic?.trim()) return errorResponse('topic is required', 400);

  // Whitelist the model name shape before it goes into a URL path — only allow the
  // gemini-<version>-<tier> pattern Google publishes, never arbitrary user input.
  const model = body.model && /^[a-z0-9.\-]+$/i.test(body.model) ? body.model : 'gemini-2.5-flash';

  const numQuestions = Math.min(Math.max(body.numQuestions ?? 5, 1), 15);
  const prompt = buildPrompt(body.mode, body.topic.trim(), body.context?.trim() || '', numQuestions);

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

    await logAdminAction(db, admin.email, 'academy.gemini_generate', 'gemini', body.mode, { topic: body.topic, model }, request);

    return corsResponse({ success: true, mode: body.mode, ...parsed });
  } catch (err: any) {
    console.error('Gemini Generate Endpoint Error:', err);
    return errorResponse('Internal server error during content generation', 500);
  }
};
