CREATE TABLE IF NOT EXISTS academy_learning_paths (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS academy_learning_path_courses (
  id TEXT PRIMARY KEY,
  path_id TEXT NOT NULL REFERENCES academy_learning_paths(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,
  UNIQUE(path_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_lp_courses_path ON academy_learning_path_courses(path_id);

-- enforcement: 'hard' blocks enrollment server-side until the prerequisite is
-- complete; 'soft' just surfaces a dismissible warning client-side. Set per
-- prerequisite link, at the instructor's discretion.
CREATE TABLE IF NOT EXISTS academy_course_prerequisites (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  prerequisite_course_id TEXT NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  enforcement TEXT NOT NULL DEFAULT 'hard',
  UNIQUE(course_id, prerequisite_course_id)
);
CREATE INDEX IF NOT EXISTS idx_prereqs_course ON academy_course_prerequisites(course_id);

-- Peer review supports both automatic random assignment (system) and
-- instructor manual assignment/reassignment from the Grading Desk.
CREATE TABLE IF NOT EXISTS academy_peer_reviews (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES academy_assignment_submissions(id) ON DELETE CASCADE,
  reviewer_user_id TEXT NOT NULL REFERENCES academy_users(id) ON DELETE CASCADE,
  feedback_text TEXT,
  score INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'submitted'
  assigned_by TEXT NOT NULL DEFAULT 'system', -- 'system' or an admin email
  assigned_at TEXT NOT NULL,
  submitted_at TEXT,
  UNIQUE(submission_id, reviewer_user_id)
);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_submission ON academy_peer_reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_reviewer ON academy_peer_reviews(reviewer_user_id);
