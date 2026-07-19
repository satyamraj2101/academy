-- SpotCLM Academy - D1 Database Schema Migration
-- 0015_totp.sql

-- Add TOTP columns for Two-Factor Authentication
ALTER TABLE academy_users ADD COLUMN totp_secret TEXT;
ALTER TABLE academy_users ADD COLUMN totp_enabled INTEGER DEFAULT 0;
