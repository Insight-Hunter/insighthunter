// apps/insighthunter-bookkeeping/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';

interface Env {
  BOOKKEEPING_LEDGER: DurableObjectNamespace;
  ENVIRONMENT?: string;
}

type EntryDirection = 'DEBIT' | 'CREDIT';
type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
type JournalStatus = 'POSTED';

interface OrganizationScope {
  organizationId: string;
  userId: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subtype: string;
  isSystem: boolean;
  createdAt: string;
}

interface TransactionDraftLine {
  accountId: string;
  direction: EntryDirection;
  amount: number;
  memo?: string;
}

interface TransactionDraft {
  description: string;
  effectiveAt: string;
  source: 'MANUAL';
  reference?: string;
  lines: TransactionDraftLine[];
}

interface JournalLine extends TransactionDraftLine {
  id: string;
}

interface JournalEntry {
  id: string;
  organizationId: string;
  description: string;
  effectiveAt: string;
  source: 'MANUAL';
  reference?: string;
  status: JournalStatus;
  lines: JournalLine[];
  createdAt: string;
}

interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  debits: number;
  credits: number;
  balance: number;
}

interface LedgerState {
  organizationId: string;
  initializedAt: string | null;
  accounts: Account[];
  journalEntries: JournalEntry[];
}

const DEFAULT_ACCOUNTS: Array<Omit<Account, 'id' | 'createdAt'>> = [
  { code: '1000', name: 'Cash', type: 'ASSET', subtype: 'CURRENT_ASSET', isSystem: true },
  { code: '1100', name: 'Accounts Receivable', type: 'ASSET', subtype: 'CURRENT_ASSET', isSystem: true },
  { code: '1200', name: 'Undeposited Funds', type: 'ASSET', subtype: 'CURRENT_ASSET', isSystem: true },
  { code: '1500', name: 'Equipment', type: 'ASSET', subtype: 'FIXED_ASSET', isSystem: true },
  { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', subtype: 'CURRENT_LIABILITY', isSystem: true },
  { code: '2100', name: 'Credit Card Payable', type: 'LIABILITY', subtype: 'CURRENT_LIABILITY', isSystem: true },
  { code: '2500', name: 'Owner Equity', type: 'EQUITY', subtype: 'EQUITY', isSystem: true },
  { code: '2600', name: 'Owner Draws', type: 'EQUITY', subtype: 'EQUITY', isSystem: true },
  { code: '4000', name: 'Sales Revenue', type: 'REVENUE', subtype: 'OPERATING_REVENUE', isSystem: true },
  { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', subtype: 'COGS', isSystem: true },
  { code: '6100', name: 'Payroll Expense', type: 'EXPENSE', subtype: 'OPERATING_EXPENSE', isSystem: true },
  { code: '6200', name: 'Rent Expense', type: 'EXPENSE', subtype: 'OPERATING_EXPENSE', isSystem: true },
  { code: '6300', name: 'Software Expense', type: 'EXPENSE', subtype: 'OPERATING_EXPENSE', isSystem: true },
  { code: '6999', name: 'Ask My Accountant', type: 'EXPENSE', subtype: 'SUSPENSE', isSystem: true },
];

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());
app.use('*', async (c, next) => {
  c.header('content-type', 'application/json; charset=utf-8');
  await next();
});

app.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'insighthunter-bookkeeping',
    environment: c.env.ENVIRONMENT ?? 'development',
    durableObjectBound: Boolean(c.env.BOOKKEEPING_LEDGER),
  }),
);


app.get('/v1/bookkeeping', (c) =>
  c.json({
    service: 'insighthunter-bookkeeping',
    capabilities: ['chart-of-accounts', 'manual-journal-posting', 'trial-balance', 'tenant-isolated-ledger'],
    nextMilestones: ['bank-feed-ingestion', 'reconciliation', 'financial-statements', 'attachments'],
  }),
);

app.use('/v1/*', async (c, next) => {
  const scope = getScope(c.req.header('x-organization-id'), c.req.header('x-user-id'));
  c.set('scope', scope);
  await next();
});

app.post('/v1/setup', async (c) => {
  const scope = c.get('scope') as OrganizationScope;
  const stub = ledgerStub(c.env, scope.organizationId);
  const result = await stub.initialize(scope);
  return c.json(result, 201);
});

app.get('/v1/accounts', async (c) => {
  const scope = c.get('scope') as OrganizationScope;
  const stub = ledgerStub(c.env, scope.organizationId);
  return c.json(await stub.listAccounts(scope));
});

app.post('/v1/accounts', async (c) => {
  const scope = c.get('scope') as OrganizationScope;
  const payload = await c.req.json();
  const stub = ledgerStub(c.env, scope.organizationId);
  return c.json(await stub.createAccount(scope, payload), 201);
});

app.get('/v1/journal-entries', async (c) => {
  const scope = c.get('scope') as OrganizationScope;
  const stub = ledgerStub(c.env, scope.organizationId);
  return c.json(await stub.listJournalEntries(scope));
});

app.post('/v1/journal-entries', async (c) => {
  const scope = c.get('scope') as OrganizationScope;
  const payload = (await c.req.json()) as TransactionDraft;
  const stub = ledgerStub(c.env, scope.organizationId);
  return c.json(await stub.postJournalEntry(scope, payload), 201);
});

app.get('/v1/reports/trial-balance', async (c) => {
  const scope = c.get('scope') as OrganizationScope;
  const stub = ledgerStub(c.env, scope.organizationId);
  return c.json(await stub.trialBalance(scope));
});

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  console.error('Unhandled bookkeeping error', err);
  return c.json({ error: 'Internal server error' }, 500);
});

app.notFound((c) => c.json({ error: 'Not found' }, 404));

export default app;

export class BookkeepingLedger implements DurableObject {
  private state: DurableObjectState;
  private storage: DurableObjectStorage;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.storage = state.storage;
  }

  async initialize(scope: OrganizationScope) {
    const current = await this.loadState(scope.organizationId);
    if (current.initializedAt) {
      return {
        organizationId: current.organizationId,
        initializedAt: current.initializedAt,
        accountCount: current.accounts.length,
        alreadyInitialized: true,
      };
    }

    const timestamp = new Date().toISOString();
    current.initializedAt = timestamp;
    current.accounts = DEFAULT_ACCOUNTS.map((account) => ({
      ...account,
      id: crypto.randomUUID(),
      createdAt: timestamp,
    }));

    await this.saveState(current);

    return {
      organizationId: current.organizationId,
      initializedAt: timestamp,
      accountCount: current.accounts.length,
      alreadyInitialized: false,
    };
  }

  async listAccounts(scope: OrganizationScope) {
    const current = await this.requireInitialized(scope.organizationId);
    return { data: current.accounts };
  }

  async createAccount(scope: OrganizationScope, payload: Partial<Account>) {
    const current = await this.requireInitialized(scope.organizationId);
    const code = safeString(payload.code, 'code');
    const name = safeString(payload.name, 'name');
    const type = parseAccountType(payload.type);
    const subtype = safeString(payload.subtype, 'subtype');

    if (current.accounts.some((account) => account.code === code)) {
      throw new HTTPException(409, { message: `Account code ${code} already exists.` });
    }

    const created: Account = {
      id: crypto.randomUUID(),
      code,
      name,
      type,
      subtype,
      isSystem: false,
      createdAt: new Date().toISOString(),
    };

    current.accounts.push(created);
    current.accounts.sort((a, b) => a.code.localeCompare(b.code));
    await this.saveState(current);

    return { data: created };
  }

  async listJournalEntries(scope: OrganizationScope) {
    const current = await this.requireInitialized(scope.organizationId);
    return {
      data: [...current.journalEntries].sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt)),
    };
  }

  async postJournalEntry(scope: OrganizationScope, draft: TransactionDraft) {
    const current = await this.requireInitialized(scope.organizationId);
    validateDraft(draft, current.accounts);

    const posted: JournalEntry = {
      id: crypto.randomUUID(),
      organizationId: scope.organizationId,
      description: draft.description.trim(),
      effectiveAt: new Date(draft.effectiveAt).toISOString(),
      source: 'MANUAL',
      reference: draft.reference?.trim() || undefined,
      status: 'POSTED',
      createdAt: new Date().toISOString(),
      lines: draft.lines.map((line) => ({
        id: crypto.randomUUID(),
        accountId: line.accountId,
        direction: line.direction,
        amount: roundMoney(line.amount),
        memo: line.memo?.trim() || undefined,
      })),
    };

    current.journalEntries.push(posted);
    await this.saveState(current);

    return { data: posted };
  }

  async trialBalance(scope: OrganizationScope) {
    const current = await this.requireInitialized(scope.organizationId);
    const rows = buildTrialBalance(current);
    const totals = rows.reduce(
      (acc, row) => {
        acc.debits = roundMoney(acc.debits + row.debits);
        acc.credits = roundMoney(acc.credits + row.credits);
        return acc;
      },
      { debits: 0, credits: 0 },
    );

    return {
      asOf: new Date().toISOString(),
      totals,
      balanced: totals.debits === totals.credits,
      data: rows,
    };
  }

  private async requireInitialized(organizationId: string) {
    const current = await this.loadState(organizationId);
    if (!current.initializedAt) {
      throw new HTTPException(412, { message: 'Ledger not initialized. Call POST /v1/setup first.' });
    }
    return current;
  }

  private async loadState(organizationId: string): Promise<LedgerState> {
    const stored = await this.storage.get<LedgerState>('ledger_state');
    return (
      stored ?? {
        organizationId,
        initializedAt: null,
        accounts: [],
        journalEntries: [],
      }
    );
  }

  private async saveState(state: LedgerState) {
    await this.storage.put('ledger_state', state);
  }
}

function getScope(organizationId: string | undefined, userId: string | undefined): OrganizationScope {
  if (!organizationId) {
    throw new HTTPException(400, { message: 'Missing x-organization-id header.' });
  }

  if (!userId) {
    throw new HTTPException(400, { message: 'Missing x-user-id header.' });
  }

  return { organizationId, userId };
}

function ledgerStub(env: Env, organizationId: string) {
  const id = env.BOOKKEEPING_LEDGER.idFromName(`ledger:${organizationId}`);
  return env.BOOKKEEPING_LEDGER.get(id) as DurableObjectStub & BookkeepingLedger;
}

function safeString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HTTPException(400, { message: `Invalid ${field}.` });
  }
  return value.trim();
}

function parseAccountType(value: unknown): AccountType {
  if (value === 'ASSET' || value === 'LIABILITY' || value === 'EQUITY' || value === 'REVENUE' || value === 'EXPENSE') {
    return value;
  }
  throw new HTTPException(400, { message: 'Invalid account type.' });
}

function validateDraft(draft: TransactionDraft, accounts: Account[]) {
  safeString(draft.description, 'description');

  if (!draft.effectiveAt || Number.isNaN(new Date(draft.effectiveAt).valueOf())) {
    throw new HTTPException(400, { message: 'Invalid effectiveAt.' });
  }

  if (draft.source !== 'MANUAL') {
    throw new HTTPException(400, { message: 'Only MANUAL source is supported in this scaffold.' });
  }

  if (!Array.isArray(draft.lines) || draft.lines.length < 2) {
    throw new HTTPException(400, { message: 'At least two journal lines are required.' });
  }

  let debits = 0;
  let credits = 0;

  for (const line of draft.lines) {
    if (!accounts.some((account) => account.id === line.accountId)) {
      throw new HTTPException(400, { message: `Unknown accountId ${line.accountId}.` });
    }

  function calculateAccountBalance(type: AccountType, debits: number, credits: number) {
  }
  switch (type) {
    case 'ASSET':
    case 'EXPENSE':
      return roundMoney(debits - credits);
    case 'LIABILITY':
    case 'EQUITY':
    case 'REVENUE':
      return roundMoney(credits - debits);
  }
}

   function roundMoney(value: number) {
      return Math.round((value + Number.EPSILON) * 100) / 100;
}}
