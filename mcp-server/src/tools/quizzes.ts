import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { adminPost } from '../client.js';

const questionSchema = z.object({
  question_text: z.string(),
  question_type: z.enum(['mcq', 'true_false', 'multi_select', 'short_answer']).default('mcq'),
  options: z.array(z.string()).optional(),
  correct_answer: z.string().describe('For mcq/true_false: the exact matching option text. For multi_select: a JSON-stringified array of correct option texts. For short_answer: leave empty — it is instructor-graded.').optional(),
  explanation: z.string().optional(),
  points: z.number().int().min(1).default(1),
});

export function registerQuizTools(server: McpServer) {
  server.registerTool(
    'create_quiz',
    {
      title: 'Create a quiz with questions',
      description: 'Creates a quiz (optionally scoped to a module) and adds one or more questions to it in a single call. Attach it to a lesson afterward via a quiz content block in the Course Builder, or reference the returned quiz_id when building lesson sections manually.',
      inputSchema: {
        course_id: z.string(),
        module_id: z.string().optional(),
        title: z.string(),
        passing_score: z.number().int().min(0).max(100).default(70),
        max_attempts: z.number().int().min(1).default(3),
        time_limit_minutes: z.number().int().min(1).optional(),
        questions: z.array(questionSchema).min(1),
      },
    },
    async ({ course_id, module_id, title, passing_score, max_attempts, time_limit_minutes, questions }) => {
      const quiz = await adminPost<{ id: string }>('/academy/quizzes', {
        course_id, module_id, title, passing_score, max_attempts, time_limit_minutes,
      });

      for (const q of questions) {
        await adminPost('/academy/quiz-questions', {
          quiz_id: quiz.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options || [],
          correct_answer: q.correct_answer || '',
          explanation: q.explanation,
          points: q.points,
        });
      }

      return { content: [{ type: 'text', text: JSON.stringify({ quiz_id: quiz.id, questions_added: questions.length }, null, 2) }] };
    }
  );
}
