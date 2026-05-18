import type { D1Database } from '@cloudflare/workers-types';
import type { Account } from '../types/accounting';

export async function getAccounts(db: D1Database, orgId: string): Promise<Account[]> {
  const { results } = await db.prepare('SELECT * FROM accounts WHERE org_id = ?').bind(orgId).all<Account>();
  return results;
}

export async function getAccountById(db: D1Database, id: string, orgId: string): Promise<Account | null> {
  const account = await db.prepare('SELECT * FROM accounts WHERE id = ? AND org_id = ?').bind(id, orgId).first<Account>();
  return account;
}

export async function insertAccount(db: D1Database, account: Account): Promise<void> {
  await db.prepare(
    'INSERT INTO accounts (id, org_id, code, name, type, sub_type, parent_id, currency, is_active, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    account.id,
    account.orgId,
    account.code,
    account.name,
    account.type,
    account.subType,
    account.parentId,
    account.currency,
    account.isActive,
    account.description,
    account.createdAt,
    account.updatedAt
  ).run();
}

export async function updateAccount(db: D1Database, account: Partial<Account> & { id: string, orgId: string }): Promise<void> {
  const { id, orgId, ...rest } = account;
  const fields = Object.keys(rest);
  const values = Object.values(rest);
  const updates = fields.map(f => `${f} = ?`).join(', ');

  await db.prepare(`UPDATE accounts SET ${updates} WHERE id = ? AND org_id = ?`)
    .bind(...values, id, orgId)
    .run();
}
