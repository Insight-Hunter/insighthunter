import type { D1Database } from '@cloudflare/workers-types';
import type {
  Account, Transaction, JournalEntry, JournalLine,
  Category, CategoryRule, ReconciliationRecord,
} from '../types/accounting';

// ─── Accounts ────────────────────────────────────────────────────────────────

export async function getAccounts(db: D1Database, orgId: string): Promise<Account[]> {
  const { results } = await db
    .prepare('SELECT * FROM accounts WHERE org_id = ? AND is_active = 1 ORDER BY code')
    .bind(orgId)
    .all<Account>();
  return results.map(mapAccount);
}

export async function getAccountById(db: D1Database, id: string, orgId: string): Promise<Account | null> {
  const row = await db
    .prepare('SELECT * FROM accounts WHERE id = ? AND org_id = ?')
    .bind(id, orgId)
    .first<Account>();
  return row ? mapAccount(row) : null;
}

export async function insertAccount(db: D1Database, a: Account): Promise<void> {
  await db.prepare(`
    INSERT INTO accounts (id, org_id, code, name, type, sub_type, parent_id, currency, is_active, description, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(a.id, a.orgId, a.code, a.name, a.type, a.subType, a.parentId,
           a.currency, a.isActive ? 1 : 0, a.description, a.createdAt, a.updatedAt)
    .run();
}

export async function updateAccount(db: D1Database, a: Partial<Account> & { id: string; orgId: string }): Promise<void> {
  await db.prepare(`
    UPDATE accounts SET name=?, description=?, is_active=?, updated_at=?
    WHERE id=? AND org_id=?
  `).bind(a.name, a.description, a.isActive ? 1 : 0, new Date().toISOString(), a.id, a.orgId)
    .run();
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface TransactionFilter {
  orgId: string;
  accountId?: string;
  categoryId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export async function getTransactions(db: D1Database, f: TransactionFilter): Promise<Transaction[]> {
  const conditions = ['org_id = ?'];
  const params: unknown[] = [f.orgId];

  if (f.accountId)  { conditions.push('account_id = ?');  params.push(f.accountId); }
  if (f.categoryId) { conditions.push('category_id = ?'); params.push(f.categoryId); }
  if (f.status)     { conditions.push('status = ?');      params.push(f.status); }
  if (f.dateFrom)   { conditions.push('date >= ?');        params.push(f.dateFrom); }
  if (f.dateTo)     { conditions.push('date <= ?');        params.push(f.dateTo); }

  params.push(f.limit ?? 100, f.offset ?? 0);
  const { results } = await db
    .prepare(`SELECT * FROM transactions WHERE ${conditions.join(' AND ')} ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?`)
    .bind(...params)
    .all<any>();
  return results.map(mapTransaction);
}

export async function getTransactionById(db: D1Database, id: string, orgId: string): Promise<Transaction | null> {
  const row = await db
    .prepare('SELECT * FROM transactions WHERE id = ? AND org_id = ?')
    .bind(id, orgId)
    .first<any>();
  return row ? mapTransaction(row) : null;
}

export async function insertTransaction(db: D1Database, t: Transaction): Promise<void> {
  await db.prepare(`
    INSERT INTO transactions (id, org_id, date, description, amount, currency, status, category_id, account_id, external_id, source, metadata, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(t.id, t.orgId, t.date, t.description, t.amount, t.currency, t.status,
           t.categoryId, t.accountId, t.externalId, t.source,
           t.metadata ? JSON.stringify(t.metadata) : null,
           t.createdAt, t.updatedAt)
    .run();
}

export async function updateTransactionCategory(
  db: D1Database, id: string, orgId: string, categoryId: string
): Promise<void> {
  await db.prepare(
    'UPDATE transactions SET category_id=?, updated_at=? WHERE id=? AND org_id=?'
  ).bind(categoryId, new Date().toISOString(), id, orgId).run();
}

export async function updateTransactionStatus(
  db: D1Database, id: string, orgId: string, status: string
): Promise<void> {
  await db.prepare(
    'UPDATE transactions SET status=?, updated_at=? WHERE id=? AND org_id=?'
  ).bind(status, new Date().toISOString(), id, orgId).run();
}

// ─── Journal ──────────────────────────────────────────────────────────────────

export async function insertJournalEntry(db: D1Database, entry: JournalEntry): Promise<void> {
  await db.prepare(`
    INSERT INTO journal_entries (id, org_id, transaction_id, date, reference, memo, is_balanced, created_by, created_at)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).bind(entry.id, entry.orgId, entry.transactionId, entry.date, entry.reference,
           entry.memo, entry.isBalanced ? 1 : 0, entry.createdBy, entry.createdAt)
    .run();

  for (const line of entry.lines) {
    await db.prepare(`
      INSERT INTO journal_lines (id, entry_id, account_id, debit, credit, memo, line_order)
      VALUES (?,?,?,?,?,?,?)
    `).bind(line.id, line.entryId, line.accountId, line.debit, line.credit, line.memo, line.lineOrder)
      .run();
  }
}

export async function getJournalEntries(
  db: D1Database, orgId: string, dateFrom?: string, dateTo?: string, limit = 50, offset = 0
): Promise<JournalEntry[]> {
  const conditions = ['je.org_id = ?'];
  const params: unknown[] = [orgId];
  if (dateFrom) { conditions.push('je.date >= ?'); params.push(dateFrom); }
  if (dateTo)   { conditions.push('je.date <= ?'); params.push(dateTo); }
  params.push(limit, offset);

  const { results: entries } = await db.prepare(`
    SELECT * FROM journal_entries je WHERE ${conditions.join(' AND ')}
    ORDER BY je.date DESC LIMIT ? OFFSET ?
  `).bind(...params).all<any>();

  if (!entries.length) return [];

  const ids = entries.map(e => `'${e.id}'`).join(',');
  const { results: lines } = await db.prepare(
    `SELECT * FROM journal_lines WHERE entry_id IN (${ids}) ORDER BY entry_id, line_order`
  ).all<any>();

  const linesByEntry = lines.reduce((acc: Record<string, JournalLine[]>, l: any) => {
    (acc[l.entry_id] ??= []).push(mapJournalLine(l));
    return acc;
  }, {});

  return entries.map(e => ({ ...mapJournalEntryRow(e), lines: linesByEntry[e.id] ?? [] }));
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(db: D1Database, orgId: string): Promise<Category[]> {
  const { results } = await db
    .prepare('SELECT * FROM categories WHERE org_id = ? ORDER BY name')
    .bind(orgId)
    .all<any>();
  return results.map(mapCategory);
}

export async function getCategoryRules(db: D1Database, orgId: string): Promise<CategoryRule[]> {
  const { results } = await db
    .prepare('SELECT * FROM category_rules WHERE org_id = ? AND is_active = 1 ORDER BY priority DESC')
    .bind(orgId)
    .all<any>();
  return results.map(mapCategoryRule);
}

export async function insertCategory(db: D1Database, c: Category): Promise<void> {
  await db.prepare(`
    INSERT INTO categories (id, org_id, name, account_id, parent_id, color, is_system, created_at)
    VALUES (?,?,?,?,?,?,?,?)
  `).bind(c.id, c.orgId, c.name, c.accountId, c.parentId, c.color, c.isSystem ? 1 : 0, c.createdAt)
    .run();
}

export async function insertCategoryRule(db: D1Database, r: CategoryRule): Promise<void> {
  await db.prepare(`
    INSERT INTO category_rules (id, org_id, category_id, pattern, field, priority, is_active, created_at)
    VALUES (?,?,?,?,?,?,?,?)
  `).bind(r.id, r.orgId, r.categoryId, r.pattern, r.field, r.priority, r.isActive ? 1 : 0, r.createdAt)
    .run();
}

// ─── Reconciliation ───────────────────────────────────────────────────────────

export async function getReconciliationRecords(
  db: D1Database, orgId: string, accountId?: string
): Promise<ReconciliationRecord[]> {
  const sql = accountId
    ? 'SELECT * FROM reconciliation_records WHERE org_id=? AND account_id=? ORDER BY statement_date DESC'
    : 'SELECT * FROM reconciliation_records WHERE org_id=? ORDER BY statement_date DESC';
  const params = accountId ? [orgId, accountId] : [orgId];
  const { results } = await db.prepare(sql).bind(...params).all<any>();
  return results.map(mapReconciliationRecord);
}

export async function upsertReconciliationRecord(db: D1Database, r: ReconciliationRecord): Promise<void> {
  await db.prepare(`
    INSERT INTO reconciliation_records
      (id, org_id, account_id, statement_date, statement_balance, cleared_balance, difference, status, reconciled_at, reconciled_by, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(org_id, account_id, statement_date) DO UPDATE SET
      statement_balance=excluded.statement_balance,
      cleared_balance=excluded.cleared_balance,
      difference=excluded.difference,
      status=excluded.status,
      reconciled_at=excluded.reconciled_at,
      reconciled_by=excluded.reconciled_by
  `).bind(r.id, r.orgId, r.accountId, r.statementDate, r.statementBalance,
           r.clearedBalance, r.difference, r.status, r.reconciledAt, r.reconciledBy, r.createdAt)
    .run();
}

// ─── Aggregation helpers (for financial statements) ───────────────────────────

export interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  accountSubType: string;
  totalDebit: number;
  totalCredit: number;
}

export async function getAccountBalances(
  db: D1Database, orgId: string, dateFrom?: string, dateTo?: string
): Promise<AccountBalance[]> {
  const conditions = ['je.org_id = ?', 'je.is_balanced = 1'];
  const params: unknown[] = [orgId];
  if (dateFrom) { conditions.push('je.date >= ?'); params.push(dateFrom); }
  if (dateTo)   { conditions.push('je.date <= ?'); params.push(dateTo); }

  const { results } = await db.prepare(`
    SELECT
      a.id           AS accountId,
      a.code         AS accountCode,
      a.name         AS accountName,
      a.type         AS accountType,
      a.sub_type     AS accountSubType,
      SUM(jl.debit)  AS totalDebit,
      SUM(jl.credit) AS totalCredit
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.entry_id
    JOIN accounts a ON a.id = jl.account_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY a.id, a.code, a.name, a.type, a.sub_type
    ORDER BY a.code
  `).bind(...params).all<AccountBalance>();
  return results;
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function mapAccount(r: any): Account {
  return {
    id: r.id, orgId: r.org_id, code: r.code, name: r.name,
    type: r.type, subType: r.sub_type, parentId: r.parent_id,
    currency: r.currency, isActive: r.is_active === 1,
    description: r.description, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function mapTransaction(r: any): Transaction {
  return {
    id: r.id, orgId: r.org_id, date: r.date, description: r.description,
    amount: r.amount, currency: r.currency, status: r.status,
    categoryId: r.category_id, accountId: r.account_id, externalId: r.external_id,
    source: r.source, metadata: r.metadata ? JSON.parse(r.metadata) : null,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function mapJournalEntryRow(r: any): Omit<JournalEntry, 'lines'> {
  return {
    id: r.id, orgId: r.org_id, transactionId: r.transaction_id,
    date: r.date, reference: r.reference, memo: r.memo,
    isBalanced: r.is_balanced === 1, createdBy: r.created_by, createdAt: r.created_at,
  };
}

function mapJournalLine(r: any): JournalLine {
  return {
    id: r.id, entryId: r.entry_id, accountId: r.account_id,
    debit: r.debit, credit: r.credit, memo: r.memo, lineOrder: r.line_order,
  };
}

function mapCategory(r: any): Category {
  return {
    id: r.id, orgId: r.org_id, name: r.name, accountId: r.account_id,
    parentId: r.parent_id, color: r.color, isSystem: r.is_system === 1, createdAt: r.created_at,
  };
}

function mapCategoryRule(r: any): CategoryRule {
  return {
    id: r.id, orgId: r.org_id, categoryId: r.category_id, pattern: r.pattern,
    field: r.field, priority: r.priority, isActive: r.is_active === 1, createdAt: r.created_at,
  };
}

function mapReconciliationRecord(r: any): ReconciliationRecord {
  return {
    id: r.id, orgId: r.org_id, accountId: r.account_id,
    statementDate: r.statement_date, statementBalance: r.statement_balance,
    clearedBalance: r.cleared_balance, difference: r.difference, status: r.status,
    reconciledAt: r.reconciled_at, reconciledBy: r.reconciled_by, createdAt: r.created_at,
  };
}
