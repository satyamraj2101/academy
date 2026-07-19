-- Short-answer quiz questions are instructor-graded, not auto-scored. True/False
-- and Multi-select reuse the existing options/correct_answer columns (no schema
-- change needed for those two) — this migration only adds the queue for
-- short-answer submissions, mirroring academy_assignment_submissions.
CREATE TABLE IF NOT EXISTS academy_quiz_short_answer_submissions (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES academy_quiz_attempts(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES academy_quiz_questions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES academy_users(id),
  quiz_id TEXT NOT NULL REFERENCES academy_quizzes(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'graded'
  points_awarded INTEGER,
  feedback_text TEXT,
  submitted_at TEXT NOT NULL,
  graded_at TEXT,
  graded_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_qsa_status ON academy_quiz_short_answer_submissions(status);
CREATE INDEX IF NOT EXISTS idx_qsa_attempt ON academy_quiz_short_answer_submissions(attempt_id);
