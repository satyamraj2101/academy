-- SpotCLM Academy - D1 Database Schema Migration
-- 0010_certificates_v2.sql

-- We are using HMAC-SHA256 for v1 certificate verification.
-- Add credential_id and signature columns to the certificates table.
-- The credential_id is a public, shareable unique ID (e.g., 'SPOT-CERT-12345').
-- The signature ensures the certificate data hasn't been tampered with.

ALTER TABLE academy_user_certificates ADD COLUMN credential_id TEXT;
ALTER TABLE academy_user_certificates ADD COLUMN signature TEXT;
ALTER TABLE academy_user_certificates ADD COLUMN metadata_json TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_certificates_credential ON academy_user_certificates(credential_id);
