import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { adminPost, adminPut } from '../client.js';

interface OutlineLesson { title: string; summary: string }
interface OutlineQuizQuestion { question_text: string; options: string[]; correct_answer: string; explanation?: string }
interface OutlineQuiz { title: string; passing_score: number; questions: OutlineQuizQuestion[] }
interface OutlineAssignment { prompt_text: string; submission_type: 'text' | 'file' | 'both'; max_score: number }
interface OutlineModule { title: string; description: string; lessons: OutlineLesson[]; quiz?: OutlineQuiz; assignment?: OutlineAssignment }
interface Outline {
  title: string; description: string; level: string; category: string; modules: OutlineModule[];
}

// The single highest-value MCP operation: "create a full course from a
// prompt" as one tool call, instead of many. Mirrors the same pipeline the
// admin panel's AI Course Wizard uses (see CourseWizardPage.tsx) — generate
// an outline with Gemini, then materialize it via the normal admin endpoints
// so the result is indistinguishable from a course built through the web UI.
export function registerGenerateTools(server: McpServer) {
  server.registerTool(
    'generate_course_from_prompt',
    {
      title: 'Generate a full course from a prompt',
      description: 'Generates a complete course (modules, lessons, a knowledge-check quiz and a graded assignment per module) from a topic brief using Gemini, then creates it as a real draft course — in one call. Review the course in the admin panel before publishing.',
      inputSchema: {
        topic: z.string(),
        audience: z.string(),
        goal: z.string().describe('The primary learning outcome students should walk away with.'),
        level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']).default('Beginner'),
        numModules: z.number().int().min(2).max(10).default(4),
        duration: z.string().default('4 weeks'),
        tone: z.string().optional(),
        price_usd_cents: z.number().int().min(0).default(0),
        price_inr_cents: z.number().int().min(0).default(0),
      },
    },
    async ({ topic, audience, goal, level, numModules, duration, tone, price_usd_cents, price_inr_cents }) => {
      const outline = await adminPost<Outline & { success: boolean }>('/academy/gemini-generate-course', {
        topic, audience, goal, level, numModules, duration, tone,
      });

      const course = await adminPost<{ id: string }>('/academy/courses', {
        title: outline.title,
        description: outline.description,
        level: outline.level,
        duration,
        category: outline.category,
        status: 'draft',
        price_usd: price_usd_cents,
        price_inr: price_inr_cents,
      });

      let modulesCreated = 0, lessonsCreated = 0, quizzesCreated = 0, assignmentsCreated = 0;

      for (const mod of outline.modules) {
        const modRes = await adminPost<{ id: string }>('/academy/modules', {
          course_id: course.id, title: mod.title, description: mod.description,
        });
        modulesCreated++;

        let lastLessonId: string | null = null;
        for (const lesson of mod.lessons) {
          const lessonRes = await adminPost<{ id: string }>('/academy/lessons', {
            module_id: modRes.id, title: lesson.title, content_type: 'blocks',
          });
          lastLessonId = lessonRes.id;
          lessonsCreated++;

          await adminPut(`/academy/lessons/${lessonRes.id}/sections`, {
            sections: [{ section_type: 'markdown', content: `> ${lesson.summary}\n\n*Draft this lesson's full content in the Course Builder's AI Studio tab.*`, is_mandatory: true }],
          });
        }

        if (lastLessonId && (mod.quiz || mod.assignment)) {
          const extraSections: Array<{ section_type: string; content: string; is_mandatory: boolean }> = [];

          if (mod.quiz?.questions?.length) {
            const quizRes = await adminPost<{ id: string }>('/academy/quizzes', {
              course_id: course.id, module_id: modRes.id, title: mod.quiz.title, passing_score: mod.quiz.passing_score, max_attempts: 3,
            });
            for (const q of mod.quiz.questions) {
              await adminPost('/academy/quiz-questions', {
                quiz_id: quizRes.id, question_text: q.question_text, question_type: 'mcq',
                options: q.options, correct_answer: q.correct_answer, explanation: q.explanation, points: 1,
              });
            }
            quizzesCreated++;
            extraSections.push({ section_type: 'quiz', content: JSON.stringify({ quizId: quizRes.id }), is_mandatory: true });
          }

          if (mod.assignment) {
            const assignmentRes = await adminPost<{ id: string }>('/academy/assignments', {
              lesson_id: lastLessonId, prompt_text: mod.assignment.prompt_text,
              submission_type: mod.assignment.submission_type, max_score: mod.assignment.max_score,
            });
            assignmentsCreated++;
            extraSections.push({ section_type: 'assignment', content: JSON.stringify({ assignmentId: assignmentRes.id }), is_mandatory: true });
          }

          if (extraSections.length) {
            const lastSummary = mod.lessons[mod.lessons.length - 1]?.summary || '';
            await adminPut(`/academy/lessons/${lastLessonId}/sections`, {
              sections: [
                { section_type: 'markdown', content: `> ${lastSummary}\n\n*Draft this lesson's full content in the Course Builder's AI Studio tab.*`, is_mandatory: true },
                ...extraSections,
              ],
            });
          }
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            course_id: course.id, title: outline.title,
            modulesCreated, lessonsCreated, quizzesCreated, assignmentsCreated,
            note: 'Course created as a draft. Review it in the admin Course Builder, then use publish_course to make it live.',
          }, null, 2),
        }],
      };
    }
  );
}
