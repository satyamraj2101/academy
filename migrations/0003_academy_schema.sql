-- SpotCLM Academy - D1 Database Schema Migration
-- 0003_academy_schema.sql

CREATE TABLE IF NOT EXISTS academy_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'student',
  avatar_url TEXT,
  bio TEXT,
  is_active INTEGER DEFAULT 1,
  is_email_verified INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  partner_status TEXT DEFAULT 'none',
  partner_applied_at TEXT,
  credit_balance INTEGER DEFAULT 0,
  total_credits_earned INTEGER DEFAULT 0,
  login_attempts INTEGER DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_academy_users_email ON academy_users(email);
CREATE INDEX IF NOT EXISTS idx_academy_users_referral_code ON academy_users(referral_code);
CREATE INDEX IF NOT EXISTS idx_academy_users_referred_by ON academy_users(referred_by);
CREATE INDEX IF NOT EXISTS idx_academy_users_role ON academy_users(role);

CREATE TABLE IF NOT EXISTS academy_courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  long_description TEXT,
  level TEXT NOT NULL,
  duration TEXT NOT NULL,
  price_usd INTEGER DEFAULT 0,
  price_inr INTEGER DEFAULT 0,
  image_url TEXT,
  category TEXT NOT NULL,
  platforms TEXT,
  instructor_id TEXT REFERENCES academy_users(id),
  is_published INTEGER DEFAULT 0,
  is_featured INTEGER DEFAULT 0,
  enrollment_count INTEGER DEFAULT 0,
  avg_rating REAL DEFAULT 0,
  total_modules INTEGER DEFAULT 0,
  total_lessons INTEGER DEFAULT 0,
  has_certification INTEGER DEFAULT 0,
  certification_name TEXT,
  status TEXT DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_courses_category ON academy_courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_level ON academy_courses(level);
CREATE INDEX IF NOT EXISTS idx_courses_status ON academy_courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON academy_courses(instructor_id);

CREATE TABLE IF NOT EXISTS academy_modules (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL,
  is_published INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_modules_course ON academy_modules(course_id);

CREATE TABLE IF NOT EXISTS academy_lessons (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES academy_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_body TEXT,
  video_url TEXT,
  video_duration_minutes INTEGER,
  pdf_url TEXT,
  sort_order INTEGER NOT NULL,
  is_preview INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON academy_lessons(module_id);

CREATE TABLE IF NOT EXISTS academy_enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES academy_users(id),
  course_id TEXT NOT NULL REFERENCES academy_courses(id),
  payment_id TEXT,
  enrolled_at TEXT NOT NULL,
  completed_at TEXT,
  progress_percent INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  UNIQUE(user_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON academy_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON academy_enrollments(course_id);

CREATE TABLE IF NOT EXISTS academy_lesson_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES academy_users(id),
  lesson_id TEXT NOT NULL REFERENCES academy_lessons(id),
  completed INTEGER DEFAULT 0,
  completed_at TEXT,
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS academy_quizzes (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES academy_courses(id),
  module_id TEXT REFERENCES academy_modules(id),
  title TEXT NOT NULL,
  passing_score INTEGER DEFAULT 70,
  max_attempts INTEGER DEFAULT 3,
  time_limit_minutes INTEGER,
  is_certification_exam INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS academy_quiz_questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES academy_quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'mcq',
  options TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  points INTEGER DEFAULT 1,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS academy_quiz_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES academy_users(id),
  quiz_id TEXT NOT NULL REFERENCES academy_quizzes(id),
  score INTEGER NOT NULL,
  answers TEXT NOT NULL,
  passed INTEGER DEFAULT 0,
  attempted_at TEXT NOT NULL,
  time_taken_seconds INTEGER
);

CREATE TABLE IF NOT EXISTS academy_payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES academy_users(id),
  course_id TEXT NOT NULL REFERENCES academy_courses(id),
  amount INTEGER NOT NULL,
  original_amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  gateway TEXT NOT NULL,
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  gateway_signature TEXT,
  status TEXT DEFAULT 'pending',
  coupon_code TEXT,
  discount_amount INTEGER DEFAULT 0,
  credits_applied INTEGER DEFAULT 0,
  credits_applied_value INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON academy_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_order ON academy_payments(gateway_order_id);

CREATE TABLE IF NOT EXISTS academy_referral_credits (
  id TEXT PRIMARY KEY,
  beneficiary_id TEXT NOT NULL REFERENCES academy_users(id),
  source_user_id TEXT NOT NULL REFERENCES academy_users(id),
  source_event TEXT NOT NULL,
  source_event_id TEXT,
  referral_level INTEGER NOT NULL,
  credits_earned INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_referral_credits_beneficiary ON academy_referral_credits(beneficiary_id);

CREATE TABLE IF NOT EXISTS academy_credit_redemptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES academy_users(id),
  amount INTEGER NOT NULL,
  redemption_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  course_id TEXT REFERENCES academy_courses(id),
  payout_details TEXT,
  admin_notes TEXT,
  processed_at TEXT,
  created_at TEXT NOT NULL
);

-- Note: We are creating a certificates table if it doesn't exist, as it was mentioned as existing but we need to be safe.
CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  student_name TEXT,
  course_name TEXT,
  issue_date TEXT,
  expiry_date TEXT,
  status TEXT DEFAULT 'valid'
);

CREATE TABLE IF NOT EXISTS academy_user_certificates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES academy_users(id),
  certificate_id TEXT NOT NULL REFERENCES certificates(id),
  course_id TEXT NOT NULL REFERENCES academy_courses(id),
  quiz_attempt_id TEXT REFERENCES academy_quiz_attempts(id),
  issued_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS academy_audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES academy_users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details TEXT,
  ip_hash TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON academy_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON academy_audit_log(action);

-- Seed Data (from academy-data.ts)
INSERT OR IGNORE INTO academy_courses (id, title, description, level, duration, price_usd, price_inr, category, platforms, status, created_at, updated_at) 
VALUES 
('clm-fundamentals', 'CLM Platform Fundamentals', 'Master the basics of enterprise contract lifecycle management. Learn repository management, template creation, and basic reporting.', 'Beginner', '4 Weeks', 150000, 12450000, 'Administration', '["Leah", "Ironclad", "Sirion", "Icertis"]', 'published', datetime('now'), datetime('now')),
('platform-master', 'Platform Master Administration', 'Advanced administration techniques, user management, complex data migrations, and API integrations.', 'Intermediate', '6 Weeks', 250000, 20750000, 'Administration', '["Leah", "Ironclad", "Sirion", "Icertis"]', 'published', datetime('now'), datetime('now')),
('advanced-workflow', 'Advanced Workflow & Automation', 'Design and deploy dynamic condition-based workflows, automated approvals, and complex rule engines.', 'Advanced', '8 Weeks', 350000, 29050000, 'Workflow', '["Leah", "Ironclad"]', 'published', datetime('now'), datetime('now')),
('clm-consulting', 'Enterprise CLM Consulting Mastery', 'The complete consulting playbook. Learn requirements gathering, solution architecture, and enterprise deployment strategies.', 'Expert', '12 Weeks', 800000, 66400000, 'Consulting', '["All Platforms"]', 'published', datetime('now'), datetime('now'));
