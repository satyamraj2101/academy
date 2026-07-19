-- SpotCLM Academy - D1 Database Schema Migration
-- 0011_payments_and_vouchers.sql

CREATE TABLE IF NOT EXISTS academy_coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL, -- 'percentage' or 'fixed'
  discount_amount INTEGER NOT NULL, -- percentage (e.g. 20) or fixed amount in cents (e.g. 5000)
  max_uses INTEGER,
  uses INTEGER DEFAULT 0,
  expires_at TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON academy_coupons(code);

CREATE TABLE IF NOT EXISTS academy_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES academy_users(id),
  course_id TEXT NOT NULL REFERENCES academy_courses(id),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'stripe' or 'razorpay'
  provider_order_id TEXT NOT NULL UNIQUE,
  coupon_id TEXT REFERENCES academy_coupons(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_provider_id ON academy_orders(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON academy_orders(user_id);
