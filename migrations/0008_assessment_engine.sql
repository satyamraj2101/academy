-- SpotCLM Academy - D1 Database Schema Migration
-- 0008_assessment_engine.sql

CREATE TABLE IF NOT EXISTS academy_quiz_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES academy_users(id),
  quiz_id TEXT NOT NULL REFERENCES academy_quizzes(id),
  started_at TEXT NOT NULL,
  expires_at TEXT,
  completed_at TEXT,
  status TEXT DEFAULT 'in_progress'
);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_quiz ON academy_quiz_sessions(user_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_expires ON academy_quiz_sessions(expires_at);

-- Update the quiz attempts table to optionally link to a session
ALTER TABLE academy_quiz_attempts ADD COLUMN session_id TEXT REFERENCES academy_quiz_sessions(id);
