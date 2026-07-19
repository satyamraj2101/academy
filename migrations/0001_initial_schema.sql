-- SpotCLM Admin Panel - D1 Database Schema
-- Run on EACH Cloudflare account separately (dev + prod)
-- Dev:  CLOUDFLARE_API_TOKEN=<dev-token>  wrangler d1 execute spotclm-admin --file=migrations/0001_initial_schema.sql
-- Prod: CLOUDFLARE_API_TOKEN=<prod-token> wrangler d1 execute spotclm-admin --env production --file=migrations/0001_initial_schema.sql

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'viewer',
  permissions TEXT DEFAULT '[]',
  avatar_url TEXT,
  created_at TEXT,
  last_login TEXT,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  email TEXT,
  ip_hash TEXT,
  country TEXT,
  city TEXT,
  user_agent TEXT,
  device_type TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  lang TEXT,
  first_seen TEXT,
  last_seen TEXT,
  page_views INTEGER DEFAULT 0,
  is_converted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES user_sessions(id),
  email TEXT,
  event_type TEXT,
  page TEXT,
  element TEXT,
  metadata TEXT,
  duration_ms INTEGER,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_session ON activity_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON activity_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON activity_events(created_at);

CREATE TABLE IF NOT EXISTS enquiry_submissions (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  full_name TEXT,
  email TEXT,
  company TEXT,
  phone TEXT,
  service TEXT,
  timeline TEXT,
  budget TEXT,
  message TEXT,
  source TEXT DEFAULT 'contact_form',
  submitted_at TEXT,
  status TEXT DEFAULT 'new',
  admin_notes TEXT,
  assigned_to TEXT,
  replied_at TEXT,
  reply_subject TEXT,
  reply_body TEXT
);
CREATE INDEX IF NOT EXISTS idx_enquiry_status ON enquiry_submissions(status);
CREATE INDEX IF NOT EXISTS idx_enquiry_email ON enquiry_submissions(email);

CREATE TABLE IF NOT EXISTS assessment_submissions (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  email TEXT,
  contract_volume TEXT,
  user_count TEXT,
  current_process TEXT,
  platform_preference TEXT,
  timeline TEXT,
  integrations TEXT,
  lang TEXT,
  result_json TEXT,
  recommended_platform TEXT,
  readiness_score INTEGER,
  submitted_at TEXT
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  user_name TEXT,
  session_id TEXT,
  status TEXT DEFAULT 'active',
  started_at TEXT,
  last_message_at TEXT,
  resolved_at TEXT,
  assigned_admin TEXT,
  tags TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES chat_sessions(id),
  sender_type TEXT,
  sender_id TEXT,
  content TEXT,
  sent_at TEXT,
  is_read INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id);

CREATE TABLE IF NOT EXISTS email_audit (
  id TEXT PRIMARY KEY,
  enquiry_id TEXT,
  from_address TEXT,
  to_address TEXT,
  subject TEXT,
  body TEXT,
  sent_at TEXT,
  sent_by TEXT,
  resend_message_id TEXT,
  status TEXT
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id TEXT PRIMARY KEY,
  admin_email TEXT,
  action TEXT,
  target_type TEXT,
  target_id TEXT,
  details TEXT,
  ip_hash TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT,
  updated_by TEXT
);

INSERT OR IGNORE INTO system_settings VALUES ('chat_bot_enabled', 'true', datetime('now'), 'system');
INSERT OR IGNORE INTO system_settings VALUES ('chat_offline_message', 'We are currently offline. Leave your email and we will get back to you.', datetime('now'), 'system');
INSERT OR IGNORE INTO system_settings VALUES ('reply_signature', 'Best regards,\nThe SpotCLM Team\ninfo@spotclm.com', datetime('now'), 'system');
INSERT OR IGNORE INTO system_settings VALUES ('admin_notification_email', 'info@spotclm.com', datetime('now'), 'system');
INSERT OR IGNORE INTO system_settings VALUES ('turnstile_enabled', 'false', datetime('now'), 'system');

CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  name TEXT,
  subject TEXT,
  body TEXT,
  created_at TEXT,
  created_by TEXT
);

INSERT OR IGNORE INTO email_templates VALUES (
  'tpl-001', 'Standard Follow-Up',
  'Following up on your SpotCLM inquiry',
  'Dear {{name}},\n\nThank you for reaching out to SpotCLM. We have reviewed your inquiry regarding {{service}} and would love to schedule a brief call to discuss your requirements in detail.\n\nWould you be available for a 30-minute discovery call this week?\n\nBest regards,\nThe SpotCLM Team\ninfo@spotclm.com',
  datetime('now'), 'system'
);

INSERT OR IGNORE INTO email_templates VALUES (
  'tpl-002', 'Pricing Info',
  'SpotCLM Pricing Information',
  'Dear {{name}},\n\nThank you for your interest in SpotCLM. Based on your requirements, our pricing typically ranges depending on your team size and contract volume.\n\nPlease visit our pricing page at spotclm.com/pricing or reply to this email to schedule a custom quote call.\n\nBest regards,\nThe SpotCLM Team\ninfo@spotclm.com',
  datetime('now'), 'system'
);
