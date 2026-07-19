-- SpotCLM Academy - D1 Database Schema Migration
-- 0014_indexes.sql

-- Add missing performance indexes identified during Phase 6 review
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON academy_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON academy_payments(created_at);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON academy_users(created_at);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON academy_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_courses_published ON academy_courses(is_published);
