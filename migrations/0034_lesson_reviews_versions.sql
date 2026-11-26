-- Review sign-off: who checked a lesson and when. A review goes stale when the lesson text is saved again after it (see _courseChecklist.ts).
CREATE TABLE IF NOT EXISTS academy_lesson_reviews (
  lesson_id TEXT PRIMARY KEY,
  reviewed_by TEXT NOT NULL,
  reviewed_at TEXT NOT NULL,
  note TEXT
);

-- Version history: the blocks of a lesson as they were before a save replaced them, newest kept (20 per lesson).
CREATE TABLE IF NOT EXISTS academy_lesson_versions (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  reason TEXT,                          -- save | restore
  sections_json TEXT NOT NULL,          -- [{ section_type, content, is_mandatory }]
  summary TEXT                          -- short description for the list
);
CREATE INDEX IF NOT EXISTS idx_lesson_versions_lesson ON academy_lesson_versions(lesson_id, created_at DESC);
