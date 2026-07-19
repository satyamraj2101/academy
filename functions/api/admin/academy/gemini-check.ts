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

  const { admin } = context;

  if (!env.GEMINI_API_KEY) {
    return errorResponse('GEMINI_API_KEY is not configured on the server.', 500);
  }

  try {
    const data = await request.json() as { content: string; model?: string };

    if (!data.content) {
      return errorResponse('Content is required', 400);
    }

    const model = data.model && /^[a-z0-9.\-]+$/i.test(data.model) ? data.model : 'gemini-2.5-flash';

    const prompt = `Analyze this educational markdown content. 
Check for typos, grammatical errors, and markdown/LaTeX formatting issues.
Also provide a block of suggestions to improve the content for educational effectiveness.

Content:
${data.content}

Return ONLY a valid JSON object matching this structure:
{
  "issues": [
    { "type": "typo|grammar|formatting", "description": "Description of the issue", "suggestion": "Suggested fix" }
  ],
  "improvements": [
    "Suggestion 1",
    "Suggestion 2"
  ],
  "correctedText": "The full, proofread and corrected version of the markdown content"
}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API Error:", errText);
      return errorResponse('Failed to contact Gemini API. The selected model may be unavailable — try a different one.', 502);
    }

    const geminiData = await response.json() as any;
    const textResponse = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      return errorResponse('Invalid response from Gemini API', 500);
    }

    const parsedResponse = JSON.parse(textResponse);

    // Don't need to log every check, but we could if we wanted
    // await logAdminAction(context.db, admin.email, 'academy.gemini_check', 'gemini', 'api', {}, request);

    return corsResponse(parsedResponse);
  } catch (err: any) {
    console.error("Gemini Check Endpoint Error:", err);
    return errorResponse('Internal server error during Gemini check', 500);
  }
};
