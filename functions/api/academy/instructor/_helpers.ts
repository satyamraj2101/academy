// Shared helpers for the instructor-scoped API surface. Instructors are
// academy_users (JWT-authenticated via verifyAcademyUser, same login as
// students) with role='instructor' — a completely separate identity system
// from the Cloudflare-Access-gated admin panel. Every mutation here is
// scoped to courses the instructor themselves own (academy_courses.instructor_id).
import { AcademyContext, errorResponse } from '../auth/middleware';

export function requireInstructor(context: AcademyContext): Response | null {
  if (context.user.role !== 'instructor') {
    return errorResponse('Forbidden — instructor access required', 403);
  }
  return null;
}

export async function assertOwnsCourse(db: D1Database, courseId: string, instructorId: string): Promise<boolean> {
  const course = await db.prepare('SELECT instructor_id FROM academy_courses WHERE id = ?').bind(courseId).first() as any;
  return !!course && course.instructor_id === instructorId;
}

export async function assertOwnsModule(db: D1Database, moduleId: string, instructorId: string): Promise<string | null> {
  const mod = await db.prepare(`
    SELECT m.course_id FROM academy_modules m JOIN academy_courses c ON m.course_id = c.id
    WHERE m.id = ? AND c.instructor_id = ?
  `).bind(moduleId, instructorId).first() as any;
  return mod ? mod.course_id : null;
}

export async function assertOwnsLesson(db: D1Database, lessonId: string, instructorId: string): Promise<{ courseId: string; moduleId: string } | null> {
  const lesson = await db.prepare(`
    SELECT l.module_id, m.course_id FROM academy_lessons l
    JOIN academy_modules m ON l.module_id = m.id
    JOIN academy_courses c ON m.course_id = c.id
    WHERE l.id = ? AND c.instructor_id = ?
  `).bind(lessonId, instructorId).first() as any;
  return lesson ? { courseId: lesson.course_id, moduleId: lesson.module_id } : null;
}

export async function assertOwnsQuiz(db: D1Database, quizId: string, instructorId: string): Promise<boolean> {
  const quiz = await db.prepare(`
    SELECT q.id FROM academy_quizzes q JOIN academy_courses c ON q.course_id = c.id
    WHERE q.id = ? AND c.instructor_id = ?
  `).bind(quizId, instructorId).first();
  return !!quiz;
}

export async function assertOwnsAssignment(db: D1Database, assignmentId: string, instructorId: string): Promise<boolean> {
  const assignment = await db.prepare(`
    SELECT a.id FROM academy_assignments a
    JOIN academy_lessons l ON a.lesson_id = l.id
    JOIN academy_modules m ON l.module_id = m.id
    JOIN academy_courses c ON m.course_id = c.id
    WHERE a.id = ? AND c.instructor_id = ?
  `).bind(assignmentId, instructorId).first();
  return !!assignment;
}
