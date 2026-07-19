-- Migration 0019: Advanced Course Builder (Sections and Assets)

-- 1. Asset Library
CREATE TABLE IF NOT EXISTS academy_assets (
    id TEXT PRIMARY KEY,
    instructor_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES academy_users(id)
);

CREATE INDEX IF NOT EXISTS idx_assets_instructor ON academy_assets(instructor_id);

-- 2. Lesson Sections (Modular Builder)
CREATE TABLE IF NOT EXISTS academy_lesson_sections (
    id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL,
    section_type TEXT NOT NULL, -- 'markdown', 'video', 'quiz', 'assignment', 'attachment', 'ppt'
    sort_order INTEGER NOT NULL,
    content TEXT, -- JSON config or raw markdown depending on section_type
    is_mandatory INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES academy_lessons(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sections_lesson ON academy_lesson_sections(lesson_id);

-- 3. Migrate existing content_body into a markdown section for backwards compatibility
INSERT INTO academy_lesson_sections (id, lesson_id, section_type, sort_order, content, is_mandatory, created_at)
SELECT 
    hex(randomblob(16)) as id, -- Generate a unique ID (random hex) for each existing lesson
    id as lesson_id, 
    'markdown' as section_type, 
    1 as sort_order, 
    content_body as content, 
    1 as is_mandatory,
    CURRENT_TIMESTAMP as created_at
FROM academy_lessons 
WHERE content_body IS NOT NULL AND content_body != '';

-- Note: In SQLite (D1), we cannot easily drop columns. We will leave `content_body` and `video_url` 
-- in `academy_lessons` but they will be ignored by the new Course Builder.
