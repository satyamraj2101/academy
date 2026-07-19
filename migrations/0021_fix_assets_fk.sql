-- Migration 0021: Fix academy_assets.instructor_id foreign key
-- It was pointing at academy_users(id), but assets are always uploaded by an
-- admin (admin_users.id from the Cloudflare Access session), never by a
-- student/instructor academy_users row — every upload violated the FK and
-- silently failed to save its DB record (R2 object landed, but the asset
-- never appeared in the library). Point it at admin_users instead.

CREATE TABLE academy_assets_new (
    id TEXT PRIMARY KEY,
    instructor_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES admin_users(id)
);

INSERT INTO academy_assets_new SELECT * FROM academy_assets;
DROP TABLE academy_assets;
ALTER TABLE academy_assets_new RENAME TO academy_assets;
