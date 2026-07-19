-- Upvoting + instructor-only best-answer marking for threaded discussions.
ALTER TABLE academy_discussions ADD COLUMN upvote_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE academy_discussions ADD COLUMN is_best_answer INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS academy_discussion_upvotes (
  id TEXT PRIMARY KEY,
  discussion_id TEXT NOT NULL REFERENCES academy_discussions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES academy_users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE(discussion_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_discussion_upvotes_discussion ON academy_discussion_upvotes(discussion_id);
