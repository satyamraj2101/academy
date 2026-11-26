import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';
import { buildEditMessages, parseEdit, validateEditInput } from './_lessonEdit';
import { runAi, type AiEnv } from './_aiText';

interface Env extends AiEnv { DB?: D1Database }

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// One 70B edit costs a few hundred neurons of the 10,000 free per day, and the prompt improver shares that allowance.
const WORKERS_DAILY_CAP = 25;

// POST { content, instruction, what? } -> { revised, changes[], model }   or { unavailable: "reason" } (the admin keeps their own text).
// `what` says what kind of text it is ("lesson" by default; "assignment" for an assignment brief).
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyAdminRequest(request, env);
  if ('error' in auth) return auth.error;
  const { admin, db } = auth.context;
  if (!hasPermission(admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse('Invalid JSON body', 400); }
  const input = validateEditInput(body);
  if ('error' in input) return errorResponse(input.error, 400);

  const messages = buildEditMessages(input.content, input.instruction, input.what);
  const out = await runAi(env, db, messages, raw => parseEdit(raw, input.content), { kind: 'lesson_edit', workersDailyCap: WORKERS_DAILY_CAP });
  if ('unavailable' in out) return corsResponse({ unavailable: out.unavailable });

  await logAdminAction(db, admin.email, 'academy.lesson_ai_edit', 'lesson_text', out.model, { what: input.what, chars: input.content.length, requestChars: input.instruction.length }, request);
  return corsResponse({ ...out.result, model: out.model });
};
