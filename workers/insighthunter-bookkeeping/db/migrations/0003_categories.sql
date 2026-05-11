CREATE TABLE IF NOT EXISTS categories (
  id         TEXT    PRIMARY KEY,
  org_id     TEXT    NOT NULL,
  name       TEXT    NOT NULL,
  account_id TEXT    NOT NULL REFERENCES accounts(id),
  parent_id  TEXT    REFERENCES categories(id),
  color      TEXT,
  is_system  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_org ON categories(org_id);

CREATE TABLE IF NOT EXISTS category_rules (
  id          TEXT    PRIMARY KEY,
  org_id      TEXT    NOT NULL,
  category_id TEXT    NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  pattern     TEXT    NOT NULL,
  field       TEXT    NOT NULL DEFAULT 'description'
                CHECK(field IN ('description','amount','merchant')),
  priority    INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rules_org      ON category_rules(org_id);
CREATE INDEX IF NOT EXISTS idx_rules_category ON category_rules(category_id);
