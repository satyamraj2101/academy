-- Service API keys let non-interactive clients (e.g. the MCP server) call
-- the admin REST API without a Cloudflare Access browser session. Keys are
-- stored as a SHA-256 hash only — the plaintext "sk_..." value is shown to
-- the admin exactly once at creation time and never persisted.
CREATE TABLE IF NOT EXISTS service_api_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT '[]',
  created_by TEXT,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_service_keys_hash ON service_api_keys(key_hash);
