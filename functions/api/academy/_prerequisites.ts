// Shared prerequisite-check helper. A prerequisite is "met" once the student
// has completed (100% progress) the prerequisite course. Each link is either
// 'hard' (blocks enrollment until met) or 'soft' (informational only) — set
// per-link by whoever configured the course, at their discretion.

export interface UnmetPrerequisite {
  courseId: string;
  title: string;
  enforcement: 'hard' | 'soft';
}

export async function getUnmetPrerequisites(db: D1Database, userId: string, courseId: string): Promise<UnmetPrerequisite[]> {
  const { results: prereqs } = await db.prepare(`
    SELECT p.prerequisite_course_id, p.enforcement, c.title
    FROM academy_course_prerequisites p
    JOIN academy_courses c ON p.prerequisite_course_id = c.id
    WHERE p.course_id = ?
  `).bind(courseId).all();

  if (!prereqs || prereqs.length === 0) return [];

  const unmet: UnmetPrerequisite[] = [];
  for (const p of prereqs as any[]) {
    const completed = await db.prepare(`
      SELECT id FROM academy_enrollments WHERE user_id = ? AND course_id = ? AND progress_percent >= 100
    `).bind(userId, p.prerequisite_course_id).first();
    if (!completed) {
      unmet.push({ courseId: p.prerequisite_course_id, title: p.title, enforcement: p.enforcement });
    }
  }
  return unmet;
}
