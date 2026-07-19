-- Migration 0020: Course Reviews & Ratings

CREATE TABLE IF NOT EXISTS academy_course_reviews (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES academy_courses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES academy_users(id) ON DELETE CASCADE,
    UNIQUE(course_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_course ON academy_course_reviews(course_id);
