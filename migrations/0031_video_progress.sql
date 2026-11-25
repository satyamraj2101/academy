-- Student progress through an interactive lesson video (the "interactive_video" lesson section).
-- Keyed by the video's own stable id (inside the section content), NOT the section row id: the admin save path
-- replaces a lesson's sections with fresh row ids every time, which would otherwise wipe everyone's progress.
CREATE TABLE IF NOT EXISTS academy_video_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  position REAL NOT NULL DEFAULT 0,          -- resume point, seconds
  watched TEXT NOT NULL DEFAULT '[]',        -- merged [start,end] ranges actually played, seconds
  answers TEXT NOT NULL DEFAULT '{}',        -- { "<sceneId>": { "choice": 1, "correct": true } }, graded on the server
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, video_id)
);
CREATE INDEX IF NOT EXISTS idx_video_progress_user_lesson ON academy_video_progress(user_id, lesson_id);
