-- ih-ledger D1 schema

CREATE TABLE IF NOT EXISTS transactions (
  id                TEXT PRIMARY KEY,
  org_id            TEXT NOT NULL,
  external_id       TEXT,
  import_batch_id   TEXT,
  source            TEXT NOT NULL DEFAULT 'manual',
  date              TEXT NOT NULL,
  amount            REAL NOT NULL,
  description       TEXT NOT NULL,
  type              TEXT NOT NULL CHECK(type IN ('debit','credit')),
  account_id        TEXT,
  category          TEXT,
  gl_code           TEXT,
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'pending',
  reviewed_by       TEXT,
  reviewed_at       TEXT,
  qbo_synced        INTEGER NOT NULL DEFAULT 0,
  qbo_synced_at     TEXT,
  xero_synced       INTEGER NOT NULL DEFAULT 0,
  xero_synced_at    TEXT,
  created_at        TEXT NOT NULL,
  UNIQUE(org_id, external_id)
);

CREATE TABLE IF NOT EXISTS gl_accounts (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL,
  code       TEXT NOT NULL,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK(type IN ('asset','liability','equity','revenue','expense')),
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE(org_id, code)
);

CREATE TABLE IF NOT EXISTS categorization_rules (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL,
  created_by  TEXT NOT NULL,
  match_type  TEXT NOT NULL CHECK(match_type IN ('contains','starts_with','exact','regex')),
  match_value TEXT NOT NULL,
  category    TEXT NOT NULL,
  gl_code     TEXT NOT NULL,
  priority    INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transaction_anomalies (
  id             TEXT PRIMARY KEY,
  org_id         TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  reason         TEXT NOT NULL,
  resolved       INTEGER NOT NULL DEFAULT 0,
  resolved_by    TEXT,
  resolved_at    TEXT,
  created_at     TEXT NOT NULL,
  UNIQUE(transaction_id)
);

CREATE TABLE IF NOT EXISTS close_cycles (
  id             TEXT PRIMARY KEY,
  org_id         TEXT NOT NULL,
  initiated_by   TEXT NOT NULL,
  period_start   TEXT NOT NULL,
  period_end     TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'in_progress',
  steps          TEXT NOT NULL DEFAULT '[]',
  trial_balance  TEXT,
  closed_at      TEXT,
  created_at     TEXT NOT NULL,
  UNIQUE(org_id, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS accounting_integrations (
  id                  TEXT PRIMARY KEY,
  org_id              TEXT NOT NULL,
  provider            TEXT NOT NULL CHECK(provider IN ('qbo','xero')),
  realm_id            TEXT NOT NULL,
  access_token_enc    TEXT NOT NULL,
  refresh_token_enc   TEXT NOT NULL,
  token_expires_at    TEXT NOT NULL,
  last_synced_at      TEXT,
  active              INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT NOT NULL,
  UNIQUE(org_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_txns_org_date     ON transactions(org_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_txns_category     ON transactions(org_id, category);
CREATE INDEX IF NOT EXISTS idx_txns_uncategorized ON transactions(org_id, category, status);
CREATE INDEX IF NOT EXISTS idx_rules_org_priority ON categorization_rules(org_id, priority DESC, active);
CREATE INDEX IF NOT EXISTS idx_close_org         ON close_cycles(org_id, period_end DESC);
