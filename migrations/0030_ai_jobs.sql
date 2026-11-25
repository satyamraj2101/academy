-- Queue of long-running AI authoring jobs. Cloudflare enqueues (fast, <10ms);
-- the Oracle runner claims and processes them, reporting progress back through
-- the admin API with a service key. If the runner is down jobs simply wait.
CREATE TABLE IF NOT EXISTS academy_ai_jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                       -- course_from_prompt | course_from_document | course_from_transcript
  status TEXT NOT NULL DEFAULT 'queued',    -- queued | running | done | failed | cancelled
  payload TEXT NOT NULL DEFAULT '{}',
  progress TEXT NOT NULL DEFAULT '{}',      -- { step, done, total, message }
  result TEXT,                              -- { course_id, ... }
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  locked_until TEXT                         -- heartbeat lease; expired lease lets another claim retry
);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON academy_ai_jobs(status, created_at);
