-- apps/insighthunter-bookkeeping/db/schema.sql

CREATE TABLE IF NOT EXISTS bk_accounts (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL,
  name             TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'checking', -- checking|savings|credit|loan|asset|equity
  balance          REAL NOT NULL DEFAULT 0,
  opening_balance  REAL NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'USD',
  institution      TEXT NOT NULL DEFAULT '',
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bk_categories (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'expense',  -- income | expense
  color      TEXT NOT NULL DEFAULT '#94A3B8',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS bk_transactions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  account_id  TEXT NOT NULL REFERENCES bk_accounts(id),
  category_id TEXT REFERENCES bk_categories(id),
  date        TEXT NOT NULL,
  description TEXT NOT NULL,
  amount      REAL NOT NULL DEFAULT 0,
  type        TEXT NOT NULL DEFAULT 'expense',  -- income | expense
  notes       TEXT NOT NULL DEFAULT '',
  reconciled  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bk_acct_user   ON bk_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bk_cat_user    ON bk_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_bk_tx_user     ON bk_transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_bk_tx_account  ON bk_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_bk_tx_category ON bk_transactions(category_id);
