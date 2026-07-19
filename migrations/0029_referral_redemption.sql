-- Wires up credit_balance as an actual spendable wallet — previously it only
-- ever accumulated with no way to use it. INR-only for now (credits are
-- earned in INR paise; there's no FX conversion anywhere in this codebase to
-- honor them against a USD checkout without inventing a rate).
ALTER TABLE academy_orders ADD COLUMN credits_applied_cents INTEGER NOT NULL DEFAULT 0;
