-- Migration 0018: Advanced Course Builder (Metadata, Scheduling, Grading, Discussions)

-- 1. Course Metadata & Grading Fields
ALTER TABLE academy_courses ADD COLUMN subtitle TEXT;
ALTER TABLE academy_courses ADD COLUMN keywords TEXT;
ALTER TABLE academy_courses ADD COLUMN language_tags TEXT;
ALTER TABLE academy_courses ADD COLUMN banner_url TEXT;
ALTER TABLE academy_courses ADD COLUMN thumbnail_url TEXT;
ALTER TABLE academy_courses ADD COLUMN promo_card_url TEXT;
ALTER TABLE academy_courses ADD COLUMN passing_score_overall INTEGER DEFAULT 0;
ALTER TABLE academy_courses ADD COLUMN grading_policy_json TEXT;

-- 2. Drip Scheduling Fields
ALTER TABLE academy_modules ADD COLUMN drip_days INTEGER;
ALTER TABLE academy_modules ADD COLUMN unlock_date TEXT;

ALTER TABLE academy_lessons ADD COLUMN drip_days INTEGER;
ALTER TABLE academy_lessons ADD COLUMN unlock_date TEXT;

-- 3. Discussions Table
CREATE TABLE IF NOT EXISTS academy_discussions (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    lesson_id TEXT,
    user_id TEXT NOT NULL,
    parent_id TEXT,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES academy_courses(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES academy_lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES academy_users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES academy_discussions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_discussions_course ON academy_discussions(course_id);
CREATE INDEX IF NOT EXISTS idx_discussions_lesson ON academy_discussions(lesson_id);
