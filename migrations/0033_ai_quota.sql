-- Shared AI quota: how much of each free provider+model has been used today across every worker (the cloud video builder, the
-- course writer, a laptop), and until when a provider is cooling after a rate limit. Each worker still paces itself; this lets
-- them see each other so a second worker does not spend the first one's daily allowance or retry a provider that is limited.
CREATE TABLE IF NOT EXISTS academy_ai_quota (
  key TEXT PRIMARY KEY,                 -- provider:model, for example groq:openai/gpt-oss-20b
  day TEXT NOT NULL,                    -- UTC day the counts below belong to
  calls INTEGER NOT NULL DEFAULT 0,
  tokens INTEGER NOT NULL DEFAULT 0,
  cooldown_until TEXT,                  -- ISO time; ignored once it has passed
  reason TEXT,
  updated_at TEXT NOT NULL
);
