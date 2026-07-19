-- SpotCLM Admin Panel - Subscribers Table
CREATE TABLE IF NOT EXISTS subscribers (
  email TEXT PRIMARY KEY,
  created_at TEXT,
  source TEXT
);
