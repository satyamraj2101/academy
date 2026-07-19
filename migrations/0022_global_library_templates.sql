-- Migration 0022: Global reusable Quiz and Assignment templates.
-- Unlike academy_quizzes/academy_assignments, these are not tied to a course or
-- lesson — they live in the instructor's global library and get instantiated
-- into a real quiz/assignment when used inside a course.

CREATE TABLE IF NOT EXISTS academy_quiz_templates (
    id TEXT PRIMARY KEY,
    instructor_id TEXT NOT NULL,
    title TEXT NOT NULL,
    passing_score INTEGER NOT NULL DEFAULT 70,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    time_limit_minutes INTEGER,
    questions_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES admin_users(id)
);

CREATE TABLE IF NOT EXISTS academy_assignment_templates (
    id TEXT PRIMARY KEY,
    instructor_id TEXT NOT NULL,
    title TEXT NOT NULL,
    prompt_text TEXT NOT NULL,
    submission_type TEXT NOT NULL DEFAULT 'text',
    max_score INTEGER NOT NULL DEFAULT 100,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES admin_users(id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_templates_instructor ON academy_quiz_templates(instructor_id);
CREATE INDEX IF NOT EXISTS idx_assignment_templates_instructor ON academy_assignment_templates(instructor_id);
