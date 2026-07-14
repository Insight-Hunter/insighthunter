-- apps/insighthunter-main/schema.sql
-- Apply: wrangler d1 execute insighthunter-main --remote --file=schema.sql

-- Customers (one row per authenticated user)
CREATE TABLE IF NOT EXISTS customers (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL UNIQUE,
  email              TEXT NOT NULL,
  stripe_customer_id TEXT,
  created_at         TEXT NOT NULL
);

-- Organizations (one customer can have multiple orgs, e.g. multi-entity)
CREATE TABLE IF NOT EXISTS organizations (
  id          TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  name        TEXT NOT NULL,
  industry    TEXT,
  plan_code   TEXT NOT NULL DEFAULT 'lite',
  created_at  TEXT NOT NULL
);

-- Subscriptions (UNIQUE on customer_id — one active sub per customer)
CREATE TABLE IF NOT EXISTS subscriptions (
  id                        TEXT PRIMARY KEY,
  customer_id               TEXT NOT NULL UNIQUE,
  plan_code                 TEXT NOT NULL DEFAULT 'lite',
  status                    TEXT NOT NULL DEFAULT 'active',
  stripe_subscription_id    TEXT,
  stripe_checkout_session_id TEXT,
  created_at                TEXT NOT NULL,
  updated_at                TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id           ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id   ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status        ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub    ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_organizations_customer_id   ON organizations(customer_id);
