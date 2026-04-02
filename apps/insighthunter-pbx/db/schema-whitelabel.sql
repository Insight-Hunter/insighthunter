-- wrangler d1 execute pbx-db --file db/schema-whitelabel.sql --remote

CREATE TABLE IF NOT EXISTS orgs (
  org_id                  TEXT PRIMARY KEY,
  org_name                TEXT NOT NULL,
  email                   TEXT NOT NULL,
  plan_id                 TEXT NOT NULL DEFAULT 'starter',
  status                  TEXT NOT NULL DEFAULT 'active',
  -- Telnyx: one Credential Connection per tenant, all under master org
  telnyx_connection_id    TEXT,          -- credential_connections ID
  telnyx_credential_id    TEXT,          -- telephony_credentials ID (WebRTC token source)
  -- Stripe
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  stripe_sub_item_platform TEXT,         -- subscription item ID for platform fee
  stripe_sub_item_minutes  TEXT,         -- subscription item ID for metered minutes
  stripe_sub_item_numbers  TEXT,         -- subscription item ID for metered numbers
  -- Branding
  custom_domain           TEXT,
  brand_name              TEXT,
  brand_logo_url          TEXT,
  brand_primary_color     TEXT DEFAULT '#01696f',
  -- Lifecycle
  created_at              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at            TEXT,
  suspended_at            TEXT
);

CREATE INDEX IF NOT EXISTS idx_orgs_stripe  ON orgs(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_orgs_status  ON orgs(status);
CREATE INDEX IF NOT EXISTS idx_orgs_domain  ON orgs(custom_domain);
CREATE INDEX IF NOT EXISTS idx_orgs_conn    ON orgs(telnyx_connection_id);

CREATE TABLE IF NOT EXISTS admins (
  org_id     TEXT PRIMARY KEY,
  role       TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS phone_numbers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id        TEXT NOT NULL REFERENCES orgs(org_id),
  phone_number  TEXT NOT NULL,
  telnyx_id     TEXT,
  friendly_name TEXT,
  number_type   TEXT DEFAULT 'local',
  status        TEXT NOT NULL DEFAULT 'active',   -- active | porting | released
  purchased_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  released_at   TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pn_number ON phone_numbers(phone_number) WHERE status='active';
CREATE INDEX        IF NOT EXISTS idx_pn_org    ON phone_numbers(org_id);

CREATE TABLE IF NOT EXISTS plans (
  plan_id                    TEXT PRIMARY KEY,
  display_name               TEXT NOT NULL,
  monthly_platform_fee       REAL NOT NULL DEFAULT 0,
  price_per_did_month        REAL NOT NULL DEFAULT 4.00,
  price_per_min_inbound      REAL NOT NULL DEFAULT 0.025,
  price_per_min_outbound     REAL NOT NULL DEFAULT 0.035,
  price_per_vm_transcription REAL NOT NULL DEFAULT 0.02,
  max_dids                   INTEGER NOT NULL DEFAULT 3,
  max_extensions             INTEGER NOT NULL DEFAULT 5,
  max_concurrent_calls       INTEGER NOT NULL DEFAULT 3,
  stripe_price_id_platform   TEXT,   -- flat recurring price (populate after Stripe setup)
  stripe_price_id_minutes    TEXT,   -- metered price
  stripe_price_id_numbers    TEXT,   -- metered price
  created_at                 TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO plans VALUES
  ('starter',      'Starter',       29.00, 4.00, 0.025, 0.035, 0.02,  3,   5,   3,  NULL, NULL, NULL, CURRENT_TIMESTAMP),
  ('professional', 'Professional',  79.00, 3.00, 0.020, 0.028, 0.01,  15,  25,  10, NULL, NULL, NULL, CURRENT_TIMESTAMP),
  ('enterprise',   'Enterprise',   199.00, 2.00, 0.015, 0.022, 0.00,  100, 100, 50, NULL, NULL, NULL, CURRENT_TIMESTAMP);
