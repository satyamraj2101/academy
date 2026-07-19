import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';

interface Env {
  DB?: D1Database;
  GEMINI_API_KEY?: string;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

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

  let body: { content: string; model?: string };
  try {
    body = await request.json() as { content: string; model?: string };
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (!body.content?.trim()) return errorResponse('content is required', 400);

  const model = body.model && /^[a-z0-9.\-]+$/i.test(body.model) ? body.model : 'gemini-2.5-flash';

  const prompt = `You are a formatting assistant for educational Markdown + LaTeX content. Reformat the content below for clarity and visual structure — do NOT change its meaning, facts, or wording beyond light punctuation/spacing fixes.

Rules:
- Add or fix Markdown structure: headings, bold key terms, bullet/numbered lists where the content is already list-like, tables where the content is tabular.
- Fix broken or inconsistent LaTeX math delimiters (use $...$ for inline math, $$...$$ for block math) — never leave literal dollar signs adjacent to math delimiters ambiguously.
- Do not invent new facts, examples, or sentences. Do not shorten or summarize.
- Preserve all existing information.

Content to reformat:
"""
${body.content}
"""

Return ONLY a valid JSON object matching this structure:
{ "beautified": "the reformatted markdown content" }`;

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

    await logAdminAction(db, admin.email, 'academy.gemini_beautify', 'gemini', 'beautify', { model }, request);

    return corsResponse({ success: true, beautified: parsed.beautified || '' });
  } catch (err: any) {
    console.error('Gemini Beautify Endpoint Error:', err);
    return errorResponse('Internal server error during beautification', 500);
  }
};
