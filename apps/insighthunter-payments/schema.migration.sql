-- Run once against the same D1 database used by insighthunter-auth.
-- This database remains account/billing metadata only; financial data belongs
-- to the account's Durable Object or module-owned user-scoped storage.

ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;

CREATE TABLE IF NOT EXISTS entitlements (
  user_id TEXT NOT NULL REFERENCES users(id),
  module TEXT NOT NULL,
  tier TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled')),
  granted_at INTEGER NOT NULL,
  stripe_subscription_id TEXT,
  PRIMARY KEY (user_id, module)
);

CREATE TABLE IF NOT EXISTS billing_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  user_id TEXT REFERENCES users(id),
  raw_payload TEXT NOT NULL,
  received_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entitlements_active
  ON entitlements(user_id, status);
