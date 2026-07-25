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

  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT UNIQUE,
  billing_provider TEXT DEFAULT 'stripe',
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER DEFAULT 0,
  canceled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS billing_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  processed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  subscription_id TEXT,
  feature_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'plan',
  granted_at TEXT NOT NULL,
  expires_at TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_events_provider_event_id ON billing_events(provider_event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_checkout_session_id ON subscriptions(stripe_checkout_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_customer_feature
  ON entitlements(customer_id, feature_key);
CREATE INDEX IF NOT EXISTS idx_entitlements_subscription_id
  ON entitlements(subscription_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_status
  ON entitlements(status);
