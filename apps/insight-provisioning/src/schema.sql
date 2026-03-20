-- Chart of Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK(type IN ('asset','liability','equity','revenue','expense')),
  balance    REAL DEFAULT 0,
  currency   TEXT DEFAULT 'USD',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Double-entry transactions
CREATE TABLE IF NOT EXISTS transactions (
  id                TEXT PRIMARY KEY,
  date              TEXT NOT NULL,
  description       TEXT NOT NULL,
  amount            REAL NOT NULL,
  debit_account_id  TEXT NOT NULL,
  credit_account_id TEXT NOT NULL,
  category          TEXT,
  status            TEXT DEFAULT 'cleared' CHECK(status IN ('cleared','pending','reconciled')),
  reference         TEXT,
  created_at        TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(debit_account_id)  REFERENCES accounts(id),
  FOREIGN KEY(credit_account_id) REFERENCES accounts(id)
);

-- Invoices / AR
CREATE TABLE IF NOT EXISTS invoices (
  id          TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  amount      REAL NOT NULL,
  due_date    TEXT,
  status      TEXT DEFAULT 'draft' CHECK(status IN ('draft','sent','paid','overdue','void')),
  line_items  TEXT DEFAULT '[]',
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_txn_date     ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_txn_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_inv_status   ON invoices(status);
