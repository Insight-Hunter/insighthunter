-- apps/insighthunter-bizforma/db/schema.sql
-- Run AFTER migration-002 on the auth DB (or use same DB with binding alias)

CREATE TABLE IF NOT EXISTS formation_orders (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL,
  stripe_session_id     TEXT UNIQUE,
  stripe_payment_intent TEXT,
  entity_type           TEXT NOT NULL DEFAULT 'LLC',
  state                 TEXT NOT NULL DEFAULT 'GA',
  business_name         TEXT NOT NULL DEFAULT '',
  status                TEXT NOT NULL DEFAULT 'pending',  -- pending | paid | expired
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_user   ON formation_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe ON formation_orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON formation_orders(status);
