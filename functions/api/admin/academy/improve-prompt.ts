import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission } from '../middleware';
import { buildMessages, parseImprovement, validateInput } from './_improvePrompt';
import { takeSlot } from './_aiUsage';

// Runs on Cloudflare Workers AI (the free daily allowance), not on Gemini, so suggesting improvements never uses the quota
// that writes the courses.
interface Env {
  DB?: D1Database;
  AI?: { run: (model: string, input: Record<string, unknown>) => Promise<any> };
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// Small, fast instruction models, tried in order. A failure (model retired, busy, allowance used up) just moves on to the next.
const MODELS = ['@cf/meta/llama-3.1-8b-instruct-fast', '@cf/meta/llama-3.1-8b-instruct', '@cf/meta/llama-3.2-3b-instruct'];
// Each call costs a few neurons; the free allowance is 10,000 a day. This keeps well inside it even if the account were on a paid plan.
const DAILY_CAP = 400;
const KIND = 'improve_prompt';

// POST { kind?, text } or { fields: { topic, audience, level, goal, duration, tone } }
//  -> { improved, improvedFields?, changes[], missing[], score, model }   or { unavailable: "reason", improved: <original> }
// It never fails the form it sits behind: when the helper cannot run, the admin simply gets their own text back.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyAdminRequest(request, env);
  if ('error' in auth) return auth.error;
  if (!hasPermission(auth.context.admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse('Invalid JSON body', 400); }
  const input = validateInput(body);
  if ('error' in input) return errorResponse(input.error, 400);
  const original = { text: input.text, fields: input.fields };
  const unavailable = (reason: string) => corsResponse({ unavailable: reason, improved: input.text, improvedFields: input.fields, changes: [], missing: [], score: null });

  if (!env.AI) return unavailable('The AI helper is not connected on this server.');
  try {
    if (!(await takeSlot(auth.context.db, KIND, DAILY_CAP))) return unavailable('Today\'s free suggestions are used up. They reset at midnight UTC.');
  } catch {
    return unavailable('Suggestions are paused (usage counter unavailable).');
  }

  const messages = buildMessages(input.kind, input.text, input.fields);
  for (const model of MODELS) {
    try {
      const out = await env.AI.run(model, { messages, max_tokens: 700, temperature: 0.2 });
      const result = parseImprovement(out?.response ?? out?.result?.response ?? out, original);
      if (result) return corsResponse({ ...result, model });
    } catch {
      /* try the next model */
    }
  }
  return unavailable('The AI helper could not produce a suggestion right now.');
};
