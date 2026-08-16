-- Migration: add Stripe linkage to insighthunter-auth-db
-- Run this against the SAME D1 database as insighthunter-auth's schema.sql.
-- Payments worker binds to that database (see wrangler.toml) so entitlement
-- writes land in one place — auth remains the single source of truth for
-- "what does this user have access to," payments is just what feeds it.

ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;

ALTER TABLE entitlements ADD COLUMN stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_stripe_subscription ON entitlements(stripe_subscription_id);

CREATE TABLE IF NOT EXISTS billing_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_event_id TEXT UNIQUE NOT NULL,  -- idempotency guard
  event_type TEXT NOT NULL,
  user_id TEXT,
  raw_payload TEXT NOT NULL,
  received_at INTEGER NOT NULL
);
