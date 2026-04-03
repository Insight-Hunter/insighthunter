-- insighthunter-bookkeeping schema

CREATE TABLE IF NOT EXISTS bookkeeping_accounts (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id      TEXT NOT NULL,
  code        TEXT,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK(type IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
  subtype     TEXT,
  description TEXT,
  parent_id   TEXT REFERENCES bookkeeping_accounts(id),
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_org_code
  ON bookkeeping_accounts(org_id, code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_org ON bookkeeping_accounts(org_id);

CREATE TABLE IF NOT EXISTS transactions (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id      TEXT NOT NULL,
  date        TEXT NOT NULL,
  description TEXT NOT NULL,
  reference   TEXT,
  status      TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','POSTED','VOID')),
  created_by  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_txn_org_date   ON transactions(org_id, date);
CREATE INDEX IF NOT EXISTS idx_txn_org_status ON transactions(org_id, status);

CREATE TABLE IF NOT EXISTS transaction_lines (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  account_id     TEXT NOT NULL REFERENCES bookkeeping_accounts(id),
  debit          REAL NOT NULL DEFAULT 0 CHECK(debit >= 0),
  credit         REAL NOT NULL DEFAULT 0 CHECK(credit >= 0),
  memo           TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lines_txn     ON transaction_lines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_lines_account ON transaction_lines(account_id);

CREATE TABLE IF NOT EXISTS attachments (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id         TEXT NOT NULL,
  transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
  r2_key         TEXT NOT NULL,
  filename       TEXT NOT NULL,
  size           INTEGER,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attach_txn ON attachments(transaction_id);
