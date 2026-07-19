-- SpotCLM Academy - User Settings and Lesson Knowledge Checks Schema
-- migrations/0006_user_settings_and_knowledge_checks.sql

CREATE TABLE IF NOT EXISTS academy_user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES academy_users(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'light',
  timezone TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS academy_lesson_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES academy_users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
  notes TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_user ON academy_lesson_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_lesson ON academy_lesson_notes(lesson_id);

CREATE TABLE IF NOT EXISTS academy_lesson_knowledge_checks (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options TEXT NOT NULL, -- JSON array of options
  correct_answer TEXT NOT NULL,
  explanation TEXT
);
CREATE INDEX IF NOT EXISTS idx_knowledge_checks_lesson ON academy_lesson_knowledge_checks(lesson_id);

CREATE TABLE IF NOT EXISTS academy_lesson_knowledge_check_responses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES academy_users(id) ON DELETE CASCADE,
  check_id TEXT NOT NULL REFERENCES academy_lesson_knowledge_checks(id) ON DELETE CASCADE,
  selected_answer TEXT NOT NULL,
  is_correct INTEGER DEFAULT 0,
  submitted_at TEXT NOT NULL,
  UNIQUE(user_id, check_id)
);
CREATE INDEX IF NOT EXISTS idx_check_responses_user ON academy_lesson_knowledge_check_responses(user_id);

-- Seed Knowledge Check questions for key lessons
INSERT OR IGNORE INTO academy_lesson_knowledge_checks (id, lesson_id, question_text, options, correct_answer, explanation)
VALUES 
('chk-pm-1-1', 'les-pm-1-1', 'What security principle is best practiced by defining granular user roles and permissions?', '["Least Privilege", "Defense in Depth", "Single Sign-On", "Multi-Factor Authentication"]', 'Least Privilege', 'The Principle of Least Privilege states that a user should only have access to the specific resources and information needed to complete a task.'),
('chk-pm-1-2', 'les-pm-1-2', 'Which of the following protocols is most commonly used to configure Single Sign-On (SSO) in enterprise environments?', '["SAML 2.0", "FTP", "SMTP", "POP3"]', 'SAML 2.0', 'SAML 2.0 (Security Assertion Markup Language) is the industry standard XML-based protocol for exchanging authentication and authorization data between identity providers and service providers.'),
('chk-les-1', 'les-1', 'In CLM, what does the acronym contract repository refer to?', '["A centralized digital database where all contracts are stored and organized", "A local folder on the user''s desktop", "A physical warehouse for paper documents", "A draft template document"]', 'A centralized digital database where all contracts are stored and organized', 'The contract repository serves as a single source of truth for all metadata, document versions, and history, ensuring compliance and easy retrieval.'),
('chk-les-2', 'les-2', 'Which phase of the contract lifecycle involves direct redlining and negotiation with a counterparty?', '["Negotiation", "Generation", "Approval", "Execution"]', 'Negotiation', 'The negotiation phase is where redlines, comments, and edits are exchanged between the parties to align on mutual terms.');
