import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission, logAdminAction } from '../middleware';
import { buildQuizMessages, parseQuizEdit, toQuizQ, validateQuizEditInput } from './_quizEdit';
import { runAi, type AiEnv } from './_aiText';

interface Env extends AiEnv { DB?: D1Database }

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

const WORKERS_DAILY_CAP = 15;

// POST { quizId, instruction } -> { questions[], changes[], dropped, model }   or { unavailable }
// Reads the quiz from the database (never trusts questions sent by the browser), asks the AI for the changed list and returns it
// for review. Nothing is written here: the admin applies it from the editor, one question at a time through the normal endpoints.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyAdminRequest(request, env);
  if ('error' in auth) return auth.error;
  const { admin, db } = auth.context;
  if (!hasPermission(admin, 'academy')) return errorResponse('Forbidden — insufficient permissions', 403);

  let body: any;
  try { body = await request.json(); } catch { return errorResponse('Invalid JSON body', 400); }
  const quizId = typeof body?.quizId === 'string' ? body.quizId : '';
  if (!quizId) return errorResponse('quizId is required', 400);
  const { results } = await db.prepare('SELECT * FROM academy_quiz_questions WHERE quiz_id = ? ORDER BY sort_order ASC').bind(quizId).all();
  const questions = ((results || []) as any[]).map(toQuizQ);

  const input = validateQuizEditInput({ questions, instruction: body?.instruction });
  if ('error' in input) return errorResponse(input.error, 400);

  const out = await runAi(env, db, buildQuizMessages(input.questions, input.instruction), raw => parseQuizEdit(raw, input.questions),
    { kind: 'quiz_edit', workersDailyCap: WORKERS_DAILY_CAP, json: true });
  if ('unavailable' in out) return corsResponse({ unavailable: out.unavailable });

  await logAdminAction(db, admin.email, 'academy.quiz_ai_edit', 'quiz', quizId, { model: out.model, questions: input.questions.length }, request);
  return corsResponse({ ...out.result, model: out.model });
};
