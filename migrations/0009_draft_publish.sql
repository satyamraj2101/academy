-- SpotCLM Academy - D1 Database Schema Migration
-- 0009_draft_publish.sql

-- Add columns for snapshot-based draft/publish mechanism
ALTER TABLE academy_courses ADD COLUMN draft_json TEXT;
ALTER TABLE academy_courses ADD COLUMN published_at TEXT;

ALTER TABLE academy_modules ADD COLUMN draft_json TEXT;
ALTER TABLE academy_modules ADD COLUMN published_at TEXT;

ALTER TABLE academy_lessons ADD COLUMN draft_json TEXT;
ALTER TABLE academy_lessons ADD COLUMN published_at TEXT;
