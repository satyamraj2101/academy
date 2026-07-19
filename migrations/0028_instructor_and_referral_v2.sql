-- Instructor role: students can apply, admin approves. Mirrors the existing
-- partner_status pattern. role flips to 'instructor' only on approval.
ALTER TABLE academy_users ADD COLUMN instructor_status TEXT NOT NULL DEFAULT 'none'; -- none, pending, approved, rejected
ALTER TABLE academy_users ADD COLUMN instructor_applied_at TEXT;
ALTER TABLE academy_users ADD COLUMN instructor_bio TEXT;
ALTER TABLE academy_users ADD COLUMN signup_ip_hash TEXT;

-- Referral system v2: admin-configurable commission rates (was hardcoded
-- 15%/5% in enrollments/index.ts) and a minimum cash-payout threshold.
CREATE TABLE IF NOT EXISTS academy_referral_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  l1_rate REAL NOT NULL DEFAULT 0.15,
  l2_rate REAL NOT NULL DEFAULT 0.05,
  min_payout_cents INTEGER NOT NULL DEFAULT 50000,
  updated_at TEXT NOT NULL
);
INSERT INTO academy_referral_settings (id, l1_rate, l2_rate, min_payout_cents, updated_at)
VALUES ('default', 0.15, 0.05, 50000, datetime('now'));

-- Fraud flagging: credits are still granted immediately (no false-positive
-- blocking of legit referrals) but flagged for admin review when the
-- referrer and referred user share a signup IP hash. clawed_back marks a
-- credit reversed after a payment refund.
ALTER TABLE academy_referral_credits ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed'; -- confirmed, flagged, clawed_back
ALTER TABLE academy_referral_credits ADD COLUMN payment_id TEXT;
ALTER TABLE academy_referral_credits ADD COLUMN flagged_reason TEXT;
