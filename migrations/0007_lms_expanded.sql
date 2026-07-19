-- Migration 0007: LMS Admin Panel Expansion (Assignments, Certificates, Grading)

-- 1. Manual Grading / Assignments Table
CREATE TABLE IF NOT EXISTS academy_assignments (
    id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL,
    prompt_text TEXT NOT NULL,
    submission_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'file', 'both'
    max_score INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES academy_lessons(id) ON DELETE CASCADE
);

-- 2. Student Submissions & Grading Table
CREATE TABLE IF NOT EXISTS academy_assignment_submissions (
    id TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    submission_text TEXT,
    submission_file_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'graded', 'needs_revision'
    grade_score INTEGER,
    feedback_text TEXT,
    graded_by_admin_email TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    graded_at DATETIME,
    FOREIGN KEY (assignment_id) REFERENCES academy_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES academy_users(id) ON DELETE CASCADE
);

-- 3. Certificates Ledger
CREATE TABLE IF NOT EXISTS academy_certificates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    certificate_number TEXT NOT NULL UNIQUE,
    pdf_url TEXT,
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES academy_users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES academy_courses(id) ON DELETE CASCADE
);

-- Add index for fast certificate verification
CREATE INDEX IF NOT EXISTS idx_cert_number ON academy_certificates(certificate_number);
