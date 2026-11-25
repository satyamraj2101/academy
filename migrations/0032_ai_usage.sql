-- Daily counter for free-tier AI helpers (the prompt improver). The endpoint refuses new calls once a day's cap is reached,
-- so a free Workers AI allowance can never be exceeded by accident.
CREATE TABLE IF NOT EXISTS academy_ai_usage (
  day   TEXT NOT NULL,   -- UTC date, YYYY-MM-DD (Workers AI's free allowance resets at 00:00 UTC)
  kind  TEXT NOT NULL,   -- e.g. 'improve_prompt'
  calls INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, kind)
);
