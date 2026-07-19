import { Env, CORS_HEADERS, corsResponse, corsOptionsResponse, errorResponse, verifyAcademyUser } from '../auth/middleware';

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// GET /api/academy/lessons/knowledge-check?lessonId=XXX
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user, db } = authResult.context;
  const url = new URL(request.url);
  const lessonId = url.searchParams.get('lessonId');

  if (!lessonId) return errorResponse('lessonId is required', 400);

  // Fetch question
  const check = await db.prepare('SELECT id, question_text, options, correct_answer, explanation FROM academy_lesson_knowledge_checks WHERE lesson_id = ?')
    .bind(lessonId).first() as any;

  if (!check) {
    return new Response(JSON.stringify({ success: true, check: null }), { status: 200, headers: CORS_HEADERS });
  }

  // Fetch user response if any
  const userResponse = await db.prepare('SELECT selected_answer, is_correct FROM academy_lesson_knowledge_check_responses WHERE user_id = ? AND check_id = ?')
    .bind(user.id, check.id).first() as any;

  const hasAnswered = !!userResponse;

  return new Response(JSON.stringify({
    success: true,
    check: {
      id: check.id,
      question_text: check.question_text,
      options: JSON.parse(check.options),
      // Only return explanation & correct answer if already answered
      correct_answer: hasAnswered ? check.correct_answer : undefined,
      explanation: hasAnswered ? check.explanation : undefined
    },
    userResponse: userResponse || null
  }), { status: 200, headers: CORS_HEADERS });
};

// POST /api/academy/lessons/knowledge-check
// Body: { checkId, selectedAnswer }
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authResult = await verifyAcademyUser(request, env);
  if ('error' in authResult) return authResult.error;

  const { user, db } = authResult.context;

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const checkId = body.checkId as string;
  const selectedAnswer = body.selectedAnswer as string;

  if (!checkId) return errorResponse('checkId is required', 400);
  if (!selectedAnswer) return errorResponse('selectedAnswer is required', 400);

  // Fetch the actual check details to verify correct answer
  const check = await db.prepare('SELECT correct_answer, explanation FROM academy_lesson_knowledge_checks WHERE id = ?')
    .bind(checkId).first() as any;

  if (!check) return errorResponse('Knowledge check question not found', 404);

  const isCorrect = check.correct_answer === selectedAnswer ? 1 : 0;
  const now = new Date().toISOString();
  const responseId = crypto.randomUUID();

  await db.prepare(`
    INSERT INTO academy_lesson_knowledge_check_responses (id, user_id, check_id, selected_answer, is_correct, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, check_id) DO UPDATE SET selected_answer = ?, is_correct = ?, submitted_at = ?
  `).bind(responseId, user.id, checkId, selectedAnswer, isCorrect, now, selectedAnswer, isCorrect, now).run();

  return new Response(JSON.stringify({
    success: true,
    isCorrect: !!isCorrect,
    correctAnswer: check.correct_answer,
    explanation: check.explanation
  }), { status: 200, headers: CORS_HEADERS });
};
