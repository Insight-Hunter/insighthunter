// src/backend/index.ts
import { DurableObject } from "cloudflare:workers";
import { Hono } from "hono";
import { cors } from "hono/cors";

export interface Env {
  BOOKKEEPING_LEDGER: DurableObjectNamespace;
  BOOKKEEPING_CLIENT: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// Ledger endpoints
app.post("/api/ledger/:companyId/transaction", async (c) => {
  const companyId = c.req.param("companyId");
  const id = c.env.BOOKKEEPING_LEDGER.idFromName(companyId);
  const ledger = c.env.BOOKKEEPING_LEDGER.get(id);
  return ledger.fetch(c.req.raw);
});

app.get("/api/ledger/:companyId/transactions", async (c) => {
  const companyId = c.req.param("companyId");
  const id = c.env.BOOKKEEPING_LEDGER.idFromName(companyId);
  const ledger = c.env.BOOKKEEPING_LEDGER.get(id);
  return ledger.fetch(c.req.raw);
});

app.get("/api/ledger/:companyId/balance-sheet", async (c) => {
  const companyId = c.req.param("companyId");
  const id = c.env.BOOKKEEPING_LEDGER.idFromName(companyId);
  const ledger = c.env.BOOKKEEPING_LEDGER.get(id);
  return ledger.fetch(c.req.raw);
});

app.get("/api/ledger/:companyId/profit-loss", async (c) => {
  const companyId = c.req.param("companyId");
  const id = c.env.BOOKKEEPING_LEDGER.idFromName(companyId);
  const ledger = c.env.BOOKKEEPING_LEDGER.get(id);
  return ledger.fetch(c.req.raw);
});

// Client endpoints
app.post("/api/clients/:companyId", async (c) => {
  const companyId = c.req.param("companyId");
  const id = c.env.BOOKKEEPING_CLIENT.idFromName(companyId);
  const client = c.env.BOOKKEEPING_CLIENT.get(id);
  return client.fetch(c.req.raw);
});

app.get("/api/clients/:companyId", async (c) => {
  const companyId = c.req.param("companyId");
  const id = c.env.BOOKKEEPING_CLIENT.idFromName(companyId);
  const client = c.env.BOOKKEEPING_CLIENT.get(id);
  return client.fetch(c.req.raw);
});

export default app;

// Ledger Durable Object
export class BookkeepingLedger extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.includes("/transaction") && request.method === "POST") {
      return this.createTransaction(request);
    }

    if (path.includes("/transactions") && request.method === "GET") {
      return this.getTransactions(request);
    }

    if (path.includes("/balance-sheet")) {
      return this.getBalanceSheet();
    }

    if (path.includes("/profit-loss")) {
      return this.getProfitLoss(request);
    }

    if (path.includes("/reconcile") && request.method === "POST") {
      return this.reconcileAccount(request);
    }

    return new Response("Not Found", { status: 404 });
  }

  private async createTransaction(request: Request): Promise<Response> {
    try {
      const transaction: Transaction = await request.json();

      // Validate double-entry accounting
      const debitTotal = transaction.entries
        .filter((e) => e.type === "debit")
        .reduce((sum, e) => sum + e.amount, 0);

      const creditTotal = transaction.entries
        .filter((e) => e.type === "credit")
        .reduce((sum, e) => sum + e.amount, 0);

      if (Math.abs(debitTotal - creditTotal) > 0.01) {
        return Response.json(
          { error: "Debits must equal credits" },
          { status: 400 }
        );
      }

      // Generate transaction ID
      const txId = crypto.randomUUID();
      transaction.id = txId;
      transaction.createdAt = new Date().toISOString();
      transaction.status = "posted";

      // Store transaction
      await this.ctx.storage.put(`tx:${txId}`, transaction);

      // Update account balances
      for (const entry of transaction.entries) {
        await this.updateAccountBalance(entry);
      }

      return Response.json({ success: true, transaction });
    } catch (error) {
      return Response.json(
        { error: "Failed to create transaction" },
        { status: 500 }
      );
    }
  }

  private async updateAccountBalance(entry: JournalEntry): Promise<void> {
    const balanceKey = `balance:${entry.accountId}`;
    const currentBalance = (await this.ctx.storage.get<number>(balanceKey)) || 0;

    const account = await this.getAccountById(entry.accountId);
    let newBalance = currentBalance;

    // Normal balance rules
    if (
      account.type === "asset" ||
      account.type === "expense" ||
      account.type === "cost-of-goods-sold"
    ) {
      newBalance =
        entry.type === "debit"
          ? currentBalance + entry.amount
          : currentBalance - entry.amount;
    } else {
      // liability, equity, revenue
      newBalance =
        entry.type === "credit"
          ? currentBalance + entry.amount
          : currentBalance - entry.amount;
    }

    await this.ctx.storage.put(balanceKey, newBalance);
  }

  private async getAccountById(accountId: string): Promise<Account> {
    const account = await this.ctx.storage.get<Account>(`account:${accountId}`);
    if (!account) {
      // Return default account structure
      return {
        id: accountId,
        name: accountId,
        type: "asset",
        subtype: "current-asset",
      };
    }
    return account;
  }

  private async getTransactions(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const accountId = url.searchParams.get("accountId");

    const allTransactions = await this.ctx.storage.list<Transaction>({
      prefix: "tx:",
    });

    let transactions = Array.from(allTransactions.values());

    // Filter by date range
    if (startDate) {
      transactions = transactions.filter(
        (tx) => new Date(tx.createdAt) >= new Date(startDate)
      );
    }
    if (endDate) {
      transactions = transactions.filter(
        (tx) => new Date(tx.createdAt) <= new Date(endDate)
      );
    }

    // Filter by account
    if (accountId) {
      transactions = transactions.filter((tx) =>
        tx.entries.some((e) => e.accountId === accountId)
      );
    }

    return Response.json({
      transactions: transactions.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    });
  }

  private async getBalanceSheet(): Promise<Response> {
    const accounts = await this.ctx.storage.list<Account>({ prefix: "account:" });
    const balances = await this.ctx.storage.list<number>({ prefix: "balance:" });

    const balanceMap = new Map<string, number>();
    balances.forEach((value, key) => {
      const accountId = key.replace("balance:", "");
      balanceMap.set(accountId, value);
    });

    const balanceSheet: BalanceSheet = {
      assets: {
        currentAssets: [],
        fixedAssets: [],
        total: 0,
      },
      liabilities: {
        currentLiabilities: [],
        longTermLiabilities: [],
        total: 0,
      },
      equity: {
        items: [],
        total: 0,
      },
      date: new Date().toISOString(),
    };

    accounts.forEach((account) => {
      const balance = balanceMap.get(account.id) || 0;

      if (account.type === "asset") {
        const item = { name: account.name, amount: balance };
        if (account.subtype === "current-asset") {
          balanceSheet.assets.currentAssets.push(item);
        } else {
          balanceSheet.assets.fixedAssets.push(item);
        }
        balanceSheet.assets.total += balance;
      } else if (account.type === "liability") {
        const item = { name: account.name, amount: balance };
        if (account.subtype === "current-liability") {
          balanceSheet.liabilities.currentLiabilities.push(item);
        } else {
          balanceSheet.liabilities.longTermLiabilities.push(item);
        }
        balanceSheet.liabilities.total += balance;
      } else if (account.type === "equity") {
        balanceSheet.equity.items.push({ name: account.name, amount: balance });
        balanceSheet.equity.total += balance;
      }
    });

    return Response.json(balanceSheet);
  }

  private async getProfitLoss(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate") || "2024-01-01";
    const endDate =
      url.searchParams.get("endDate") || new Date().toISOString().split("T")[0];

    const accounts = await this.ctx.storage.list<Account>({ prefix: "account:" });
    const balances = await this.ctx.storage.list<number>({ prefix: "balance:" });

    const balanceMap = new Map<string, number>();
    balances.forEach((value, key) => {
      const accountId = key.replace("balance:", "");
      balanceMap.set(accountId, value);
    });

    const profitLoss: ProfitLoss = {
      revenue: [],
      costOfGoodsSold: [],
      expenses: [],
      totalRevenue: 0,
      totalCOGS: 0,
      grossProfit: 0,
      totalExpenses: 0,
      netIncome: 0,
      startDate,
      endDate,
    };

    accounts.forEach((account) => {
      const balance = balanceMap.get(account.id) || 0;

      if (account.type === "revenue") {
        profitLoss.revenue.push({ name: account.name, amount: balance });
        profitLoss.totalRevenue += balance;
      } else if (account.type === "cost-of-goods-sold") {
        profitLoss.costOfGoodsSold.push({ name: account.name, amount: balance });
        profitLoss.totalCOGS += balance;
      } else if (account.type === "expense") {
        profitLoss.expenses.push({ name: account.name, amount: balance });
        profitLoss.totalExpenses += balance;
      }
    });

    profitLoss.grossProfit = profitLoss.totalRevenue - profitLoss.totalCOGS;
    profitLoss.netIncome = profitLoss.grossProfit - profitLoss.totalExpenses;

    return Response.json(profitLoss);
  }

  private async reconcileAccount(request: Request): Promise<Response> {
    const { accountId, statement } = await request.json();

    const transactions = await this.getAccountTransactions(accountId);
    const currentBalance = (await this.ctx.storage.get<number>(
      `balance:${accountId}`
    )) || 0;

    const reconciliation = {
      accountId,
      bookBalance: currentBalance,
      statementBalance: statement.endingBalance,
      difference: currentBalance - statement.endingBalance,
      reconciled: Math.abs(currentBalance - statement.endingBalance) < 0.01,
      date: new Date().toISOString(),
    };

    await this.ctx.storage.put(
      `reconciliation:${accountId}:${Date.now()}`,
      reconciliation
    );

    return Response.json(reconciliation);
  }

  private async getAccountTransactions(
    accountId: string
  ): Promise<Transaction[]> {
    const allTransactions = await this.ctx.storage.list<Transaction>({
      prefix: "tx:",
    });
    return Array.from(allTransactions.values()).filter((tx) =>
      tx.entries.some((e) => e.accountId === accountId)
    );
  }
}

// Client Durable Object
export class BookkeepingClient extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "POST") {
      return this.createClient(request);
    }
    if (request.method === "GET") {
      return this.getClients();
    }
    return new Response("Not Found", { status: 404 });
  }

  private async createClient(request: Request): Promise<Response> {
    const client: Client = await request.json();
    client.id = client.id || crypto.randomUUID();
    client.createdAt = new Date().toISOString();

    await this.ctx.storage.put(`client:${client.id}`, client);

    return Response.json({ success: true, client });
  }

  private async getClients(): Promise<Response> {
    const clients = await this.ctx.storage.list<Client>({ prefix: "client:" });
    return Response.json({
      clients: Array.from(clients.values()).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    });
  }
}

// Types
interface Transaction {
  id?: string;
  date: string;
  description: string;
  entries: JournalEntry[];
  status?: "draft" | "posted";
  createdAt?: string;
  memo?: string;
}

interface JournalEntry {
  accountId: string;
  accountName: string;
  type: "debit" | "credit";
  amount: number;
  memo?: string;
}

interface Account {
  id: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense" | "cost-of-goods-sold";
  subtype?: string;
  description?: string;
}

interface BalanceSheet {
  assets: {
    currentAssets: LineItem[];
    fixedAssets: LineItem[];
    total: number;
  };
  liabilities: {
    currentLiabilities: LineItem[];
    longTermLiabilities: LineItem[];
    total: number;
  };
  equity: {
    items: LineItem[];
    total: number;
  };
  date: string;
}

interface ProfitLoss {
  revenue: LineItem[];
  costOfGoodsSold: LineItem[];
  expenses: LineItem[];
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpenses: number;
  netIncome: number;
  startDate: string;
  endDate: string;
}

interface LineItem {
  name: string;
  amount: number;
}

interface Client {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  taxId?: string;
  createdAt?: string;
}
