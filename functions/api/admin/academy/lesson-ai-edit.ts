import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';
import { buildEditMessages, parseEdit, validateEditInput } from './_lessonEdit';
import { takeSlot } from './_aiUsage';

interface Env {
  DB?: D1Database;
  GEMINI_API_KEY?: string;
  GEMINI_EDIT_MODELS?: string;
  AI?: { run: (model: string, input: Record<string, unknown>) => Promise<any> };
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// Gemini first (best at keeping a long lesson intact), then Cloudflare Workers AI's free allowance. A model that is retired,
// busy or out of quota just hands over to the next one.
const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-2.5-flash'];
const WORKERS_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
// One 70B edit costs a few hundred neurons of the 10,000 free per day, and the prompt improver shares that allowance.
const WORKERS_DAILY_CAP = 25;
const KIND = 'lesson_edit';

async function gemini(model: string, key: string, messages: { role: string; content: string }[]): Promise<string | null> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: messages[0].content }] },
      contents: [{ role: 'user', parts: [{ text: messages[1].content }] }],
      generationConfig: { temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = await res.json() as any;
  return data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') ?? null;
}

// POST { content, instruction } -> { revised, changes[], model }   or { unavailable: "reason" } (the admin keeps their own text).
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyAdminRequest(request, env);
  if ('error' in auth) return auth.error;
  const { admin, db } = auth.context;
  if (!hasPermission(admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse('Invalid JSON body', 400); }
  const input = validateEditInput(body);
  if ('error' in input) return errorResponse(input.error, 400);

  const messages = buildEditMessages(input.content, input.instruction);
  const tried: string[] = [];

  if (env.GEMINI_API_KEY) {
    const models = (env.GEMINI_EDIT_MODELS ? env.GEMINI_EDIT_MODELS.split(',').map(s => s.trim()).filter(Boolean) : GEMINI_MODELS);
    for (const model of models) {
      try {
        const edit = parseEdit(await gemini(model, env.GEMINI_API_KEY, messages), input.content);
        if (edit) {
          await logAdminAction(db, admin.email, 'academy.lesson_ai_edit', 'lesson_text', model, { chars: input.content.length, requestChars: input.instruction.length }, request);
          return corsResponse({ ...edit, model });
        }
        tried.push(`${model}: unusable reply`);
      } catch (e: any) { tried.push(`${model}: ${String(e?.message || e).slice(0, 60)}`); }
    }
  }

  if (env.AI) {
    let allowed = false;
    try { allowed = await takeSlot(db, KIND, WORKERS_DAILY_CAP); } catch { /* counter unavailable: skip this provider */ }
    if (allowed) {
      try {
        const out = await env.AI.run(WORKERS_MODEL, { messages, max_tokens: 4096, temperature: 0.2 });
        const edit = parseEdit(out?.response ?? out?.result?.response, input.content);
        if (edit) {
          await logAdminAction(db, admin.email, 'academy.lesson_ai_edit', 'lesson_text', WORKERS_MODEL, { chars: input.content.length, requestChars: input.instruction.length }, request);
          return corsResponse({ ...edit, model: WORKERS_MODEL });
        }
        tried.push('workers-ai: unusable reply');
      } catch (e: any) { tried.push(`workers-ai: ${String(e?.message || e).slice(0, 60)}`); }
    } else tried.push('workers-ai: daily allowance used');
  }

  console.error('lesson-ai-edit: no provider produced a usable edit:', tried.join('; '));
  return corsResponse({ unavailable: tried.length ? 'The AI could not make that change right now. Try again in a minute, or word the request a little differently.' : 'No AI provider is connected on this server.' });
};
