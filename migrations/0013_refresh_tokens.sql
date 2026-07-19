-- SpotCLM Academy - D1 Database Schema Migration
-- 0013_refresh_tokens.sql

-- Table to store valid refresh tokens. 
-- Allows for centralized session revocation.
CREATE TABLE IF NOT EXISTS academy_refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES academy_users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  revoked INTEGER DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON academy_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON academy_refresh_tokens(token_hash);
