-- SpotCLM Academy - D1 Database Schema Migration
-- 0012_notifications.sql

CREATE TABLE IF NOT EXISTS academy_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES academy_users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON academy_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON academy_notifications(is_read);
