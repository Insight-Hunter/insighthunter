CREATE TABLE IF NOT EXISTS accounts (
  id          TEXT    PRIMARY KEY,
  org_id      TEXT    NOT NULL,
  code        TEXT    NOT NULL,
  name        TEXT    NOT NULL,
  type        TEXT    NOT NULL CHECK(type IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
  sub_type    TEXT    NOT NULL,
  parent_id   TEXT    REFERENCES accounts(id),
  currency    TEXT    NOT NULL DEFAULT 'USD',
  is_active   INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, code)
);

CREATE INDEX IF NOT EXISTS idx_accounts_org  ON accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(org_id, type);

CREATE TABLE IF NOT EXISTS transactions (
  id          TEXT    PRIMARY KEY,
  org_id      TEXT    NOT NULL,
  date        TEXT    NOT NULL,
  description TEXT    NOT NULL,
  amount      INTEGER NOT NULL,
  currency    TEXT    NOT NULL DEFAULT 'USD',
  status      TEXT    NOT NULL DEFAULT 'PENDING'
                CHECK(status IN ('PENDING','POSTED','VOID','RECONCILED')),
  category_id TEXT,
  account_id  TEXT    NOT NULL REFERENCES accounts(id),
  external_id TEXT,
  source      TEXT    NOT NULL DEFAULT 'manual'
                CHECK(source IN ('manual','import','api')),
  metadata    TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_external
  ON transactions(org_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_org     ON transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date    ON transactions(org_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status  ON transactions(org_id, status);
