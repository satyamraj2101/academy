-- Starter gamification: flat point values per action, a 5-badge starter set,
-- and daily streak tracking. Tuned later via academy_badges, not hardcoded.
ALTER TABLE academy_users ADD COLUMN points INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS academy_badges (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'award'
);

CREATE TABLE IF NOT EXISTS academy_user_badges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES academy_users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES academy_badges(id) ON DELETE CASCADE,
  awarded_at TEXT NOT NULL,
  UNIQUE(user_id, badge_id)
);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON academy_user_badges(user_id);

CREATE TABLE IF NOT EXISTS academy_streaks (
  user_id TEXT PRIMARY KEY REFERENCES academy_users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT
);

INSERT INTO academy_badges (id, slug, title, description, icon) VALUES
  ('bdg-first-lesson', 'first_lesson_complete', 'First Lesson Complete', 'Completed your first lesson.', 'play-circle'),
  ('bdg-7day-streak', 'seven_day_streak', '7-Day Streak', 'Stayed active on the platform 7 days in a row.', 'flame'),
  ('bdg-course-completion', 'course_completion', 'Course Completion', 'Completed an entire course.', 'graduation-cap'),
  ('bdg-perfect-quiz', 'perfect_quiz_score', 'Perfect Quiz Score', 'Scored 100% on a quiz.', 'target'),
  ('bdg-first-certificate', 'first_certificate', 'First Certificate Earned', 'Earned your first certificate.', 'award');
