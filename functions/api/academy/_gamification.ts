// Shared gamification helper — the one place that awards points, checks
// badge criteria, and updates streaks. Called from every completion path
// (lesson progress, quiz submission, course completion, certificate issuance)
// instead of duplicating this logic at each call site.

const POINTS = {
  LESSON_COMPLETE: 10,
  COURSE_COMPLETE: 50,
  QUIZ_PASS: 25,
};

const BADGE_SLUGS = {
  FIRST_LESSON: 'first_lesson_complete',
  SEVEN_DAY_STREAK: 'seven_day_streak',
  COURSE_COMPLETION: 'course_completion',
  PERFECT_QUIZ: 'perfect_quiz_score',
  FIRST_CERTIFICATE: 'first_certificate',
} as const;

async function awardPoints(db: D1Database, userId: string, amount: number) {
  await db.prepare('UPDATE academy_users SET points = points + ? WHERE id = ?').bind(amount, userId).run();
}

async function awardBadge(db: D1Database, userId: string, slug: string): Promise<boolean> {
  const badge = await db.prepare('SELECT id FROM academy_badges WHERE slug = ?').bind(slug).first() as any;
  if (!badge) return false;

  const existing = await db.prepare('SELECT id FROM academy_user_badges WHERE user_id = ? AND badge_id = ?').bind(userId, badge.id).first();
  if (existing) return false;

  await db.prepare('INSERT INTO academy_user_badges (id, user_id, badge_id, awarded_at) VALUES (?, ?, ?, ?)')
    .bind(crypto.randomUUID(), userId, badge.id, new Date().toISOString()).run();
  return true;
}

// Updates the user's daily activity streak — call once per "the user did
// something" event per day. Consecutive calendar days increment the streak;
// a gap of more than one day resets it to 1.
async function touchStreak(db: D1Database, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const streak = await db.prepare('SELECT current_streak, longest_streak, last_active_date FROM academy_streaks WHERE user_id = ?').bind(userId).first() as any;

  if (!streak) {
    await db.prepare('INSERT INTO academy_streaks (user_id, current_streak, longest_streak, last_active_date) VALUES (?, 1, 1, ?)').bind(userId, today).run();
    return;
  }

  if (streak.last_active_date === today) return; // already counted today

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const nextStreak = streak.last_active_date === yesterday ? streak.current_streak + 1 : 1;
  const longest = Math.max(streak.longest_streak, nextStreak);

  await db.prepare('UPDATE academy_streaks SET current_streak = ?, longest_streak = ?, last_active_date = ? WHERE user_id = ?')
    .bind(nextStreak, longest, today, userId).run();

  if (nextStreak >= 7) {
    await awardBadge(db, userId, BADGE_SLUGS.SEVEN_DAY_STREAK);
  }
}

export async function onLessonCompleted(db: D1Database, userId: string) {
  await awardPoints(db, userId, POINTS.LESSON_COMPLETE);
  await touchStreak(db, userId);

  const completedCount = await db.prepare('SELECT COUNT(*) as c FROM academy_lesson_progress WHERE user_id = ? AND completed = 1').bind(userId).first() as any;
  if ((completedCount?.c || 0) === 1) {
    await awardBadge(db, userId, BADGE_SLUGS.FIRST_LESSON);
  }
}

export async function onCourseCompleted(db: D1Database, userId: string) {
  await awardPoints(db, userId, POINTS.COURSE_COMPLETE);
  await awardBadge(db, userId, BADGE_SLUGS.COURSE_COMPLETION);
}

export async function onQuizPassed(db: D1Database, userId: string, scorePercentage: number) {
  await awardPoints(db, userId, POINTS.QUIZ_PASS);
  await touchStreak(db, userId);
  if (scorePercentage >= 100) {
    await awardBadge(db, userId, BADGE_SLUGS.PERFECT_QUIZ);
  }
}

export async function onCertificateIssued(db: D1Database, userId: string) {
  await awardBadge(db, userId, BADGE_SLUGS.FIRST_CERTIFICATE);
}
