import { Agent, type Connection, type WSMessage } from "agents";
import type {
  Env,
  BookkeepingAgentState,
  ClassificationJob,
} from "../types.js";
import { classifyTransaction } from "../services/aiClassifier.js";

interface AgentMessage {
  type:
    | "classify"
    | "approve_classification"
    | "reject_classification"
    | "ping";
  payload?: Record<string, unknown>;
}

interface AgentOutbound {
  type:
    | "classification_ready"
    | "classification_complete"
    | "error"
    | "pong"
    | "pending_count";
  payload?: Record<string, unknown>;
}

// One BookkeepingAgent per org — handles real-time AI classification
// and pushes ambiguities to connected dashboard clients via WebSocket
export class BookkeepingAgent extends Agent<Env, BookkeepingAgentState> {
  initialState: BookkeepingAgentState = {
    orgId: "",
    pendingCount: 0,
    lastClassifiedAt: null,
    processingTransactionId: null,
  };

  async onConnect(connection: Connection): Promise<void> {
    connection.accept();
    // Send current pending count on connect
    const pending = await this.getPendingCount();
    const msg: AgentOutbound = {
      type: "pending_count",
      payload: { count: pending },
    };
    connection.send(JSON.stringify(msg));
  }

  async onMessage(connection: Connection, message: WSMessage): Promise<void> {
    let data: AgentMessage;
    try {
      data = JSON.parse(message as string) as AgentMessage;
    } catch {
      return;
    }

    switch (data.type) {
      case "ping":
        connection.send(JSON.stringify({ type: "pong" } as AgentOutbound));
        break;

      case "approve_classification": {
        const { queueItemId, accountId } = data.payload as {
          queueItemId: string;
          accountId: string;
        };
        await this.resolveClassification(queueItemId, accountId, "approved");
        this.broadcast({
          type: "classification_complete",
          payload: { queueItemId },
        });
        break;
      }
// Inside BookkeepingAgent class (agents/BookkeepingAgent.ts)

async onRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/classify" && request.method === "POST") {
    const job = (await request.json()) as ClassificationJob;
    // Ensure orgId is tracked in state for pending counts
    this.setState({ ...this.state, orgId: job.orgId });
    await this.runClassification(job);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Not found", { status: 404 });
}

      case "reject_classification": {
        const { queueItemId, accountId } = data.payload as {
          queueItemId: string;
          accountId: string;
        };
        await this.resolveClassification(queueItemId, accountId, "answered");
        this.broadcast({
          type: "classification_complete",
          payload: { queueItemId },
        });
        break;
      }
    }
  }

  async onMessage_classifyBatch(jobs: ClassificationJob[]): Promise<void> {
    for (const job of jobs) {
      await this.runClassification(job);
    }
  }

  // Called from the Queue consumer — classify a single transaction
  async runClassification(job: ClassificationJob): Promise<void> {
    this.setState({
   // Inside BookkeepingAgent class (agents/BookkeepingAgent.ts)

async onRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/classify" && request.method === "POST") {
    const job = (await request.json()) as ClassificationJob;
    // Ensure orgId is tracked in state for pending counts
    this.setState({ ...this.state, orgId: job.orgId });
    await this.runClassification(job);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Not found", { status: 404 });
}
   ...this.state,
      processingTransactionId: job.transactionId,
    });

    const db = this.env.DB;

    // Fetch transaction + available accounts for this org
    const [txRow, accountRows] = await Promise.all([
      db
        .prepare("SELECT * FROM transactions WHERE id = ? AND org_id = ?")
        .bind(job.transactionId, job.orgId)
        .first(),
      db
        .prepare(
          "SELECT id, name, type, subtype, code FROM accounts WHERE org_id = ? AND is_active = 1"
        )
        .bind(job.orgId)
        .all(),
    ]);

    if (!txRow) return;

    const tx = txRow as Record<string, unknown>;
    const accounts = accountRows.results as Array<{
      id: string;
      name: string;
      type: string;
      subtype: string;
      code: string;
    }>;

    const result = await classifyTransaction(
      {
        id: tx["id"] as string,
        description: tx["description"] as string,
        amount: tx["amount"] as number,
        date: tx["date"] as string,
        source: tx["source"] as string,
      },
      accounts,
      this.env.AI
    );

    const queueId = crypto.randomUUID();
    const now = new Date().toISOString();

    if (result.confidence >= 0.92 && !result.needsHumanReview) {
      // High-confidence: auto-post the classification
      await db.batch([
        db
          .prepare(
            "UPDATE transactions SET account_id=?, confidence=?, ai_reasoning=?, status='approved', updated_at=? WHERE id=?"
          )
          .bind(
            result.suggestedAccountId,
            result.confidence,
            result.reasoning,
            now,
            job.transactionId
          ),
      ]);

      await this.createJournalEntryFromTransaction(
        job.transactionId,
        job.orgId,
        result.suggestedAccountId!
      );
    } else {
      // Low-confidence or ambiguous: push to AI queue for human review
      await db.batch([
        db
          .prepare(
            "UPDATE transactions SET account_id=?, confidence=?, ai_reasoning=?, status='pending_approval', updated_at=? WHERE id=?"
          )
          .bind(
            result.suggestedAccountId,
            result.confidence,
            result.reasoning,
            now,
            job.transactionId
          ),
        db
          .prepare(
            `INSERT INTO ai_classification_queue
               (id,org_id,transaction_id,question,suggested_account_id,suggested_account_name,
                confidence,ai_reasoning,alternatives,status,created_at)
             VALUES (?,?,?,?,?,?,?,?,?,  'pending',?)`
          )
          .bind(
            queueId,
            job.orgId,
            job.transactionId,
            result.question ?? "Please review this transaction classification.",
            result.suggestedAccountId,
            result.suggestedAccountName,
            result.confidence,
            result.reasoning,
            JSON.stringify(result.alternatives),
            now
          ),
      ]);

      // Broadcast to all connected dashboard sessions for this org
      const outbound: AgentOutbound = {
        type: "classification_ready",
        payload: {
          queueItemId: queueId,
          transactionId: job.transactionId,
          question: result.question,
          suggestedAccountId: result.suggestedAccountId,
          suggestedAccountName: result.suggestedAccountName,
          confidence: result.confidence,
          alternatives: result.alternatives,
        },
      };
      this.broadcast(outbound);
    }

    const pending = await this.getPendingCount();
    this.setState({
      ...this.state,
      pendingCount: pending,
      lastClassifiedAt: now,
      processingTransactionId: null,
    });
  }

  private async resolveClassification(
    queueItemId: string,
    accountId: string,
    status: "approved" | "answered"
  ): Promise<void> {
    const now = new Date().toISOString();
    const db = this.env.DB;

    const item = await db
      .prepare("SELECT * FROM ai_classification_queue WHERE id = ?")
      .bind(queueItemId)
      .first<{ transaction_id: string; org_id: string }>();

    if (!item) return;

    await db.batch([
      db
        .prepare(
          "UPDATE ai_classification_queue SET status=?, resolved_account_id=?, resolved_at=? WHERE id=?"
        )
        .bind(status, accountId, now, queueItemId),
      db
        .prepare(
          "UPDATE transactions SET account_id=?, status='approved', updated_at=? WHERE id=?"
        )
        .bind(accountId, now, item.transaction_id),
    ]);

    await this.createJournalEntryFromTransaction(
      item.transaction_id,
      item.org_id,
      accountId
    );
  }

  // Creates a balanced double-entry journal entry for a classified transaction
  private async createJournalEntryFromTransaction(
    transactionId: string,
    orgId: string,
    accountId: string
  ): Promise<void> {
    const db = this.env.DB;
    const now = new Date().toISOString();

    const tx = await db
      .prepare("SELECT * FROM transactions WHERE id = ?")
      .bind(transactionId)
      .first<{
        date: string;
        description: string;
        amount: number;
        bank_account_ref: string | null;
      }>();

    if (!tx) return;

    // Find the bank/cash account for this org (first active bank account)
    const bankAccount = await db
      .prepare(
        "SELECT id FROM accounts WHERE org_id=? AND subtype='bank' AND is_active=1 LIMIT 1"
      )
      .bind(orgId)
      .first<{ id: string }>();

    if (!bankAccount) return;

    const jeId = crypto.randomUUID();
    const line1Id = crypto.randomUUID();
    const line2Id = crypto.randomUUID();

    // Positive amount = money in (debit bank, credit income/account)
    const isDeposit = tx.amount > 0;
    const abs = Math.abs(tx.amount);

    await db.batch([
      db
        .prepare(
          `INSERT INTO journal_entries (id,org_id,date,memo,type,status,created_by,created_at,updated_at)
           VALUES (?,?,?,?,'bank','posted','ai',?,?)`
        )
        .bind(jeId, orgId, tx.date, tx.description, now, now),
      // Line 1: Bank account
      db
        .prepare(
          `INSERT INTO journal_entry_lines (id,journal_entry_id,account_id,debit,credit,description,created_at)
           VALUES (?,?,?,?,?,?,?)`
        )
        .bind(
          line1Id,
          jeId,
          bankAccount.id,
          isDeposit ? abs : 0,
          isDeposit ? 0 : abs,
          tx.description,
          now
        ),
      // Line 2: Classified account (opposite side)
      db
        .prepare(
          `INSERT INTO journal_entry_lines (id,journal_entry_id,account_id,debit,credit,description,created_at)
           VALUES (?,?,?,?,?,?,?)`
        )
        .bind(
          line2Id,
          jeId,
          accountId,
          isDeposit ? 0 : abs,
          isDeposit ? abs : 0,
          tx.description,
          now
        ),
      // Link transaction → journal entry
      db
        .prepare(
          "UPDATE transactions SET journal_entry_id=?, status='posted', updated_at=? WHERE id=?"
        )
        .bind(jeId, now, transactionId),
    ]);

    // Update account balances
    await this.updateAccountBalance(bankAccount.id, isDeposit ? abs : -abs);
    await this.updateAccountBalance(accountId, isDeposit ? -abs : abs);
  }

  private async updateAccountBalance(
    accountId: string,
    delta: number
  ): Promise<void> {
    await this.env.DB.prepare(
      "UPDATE accounts SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?"
    )
      .bind(delta, accountId)
      .run();
  }

  private async getPendingCount(): Promise<number> {
    const result = await this.env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM ai_classification_queue WHERE org_id=? AND status='pending'"
    )
      .bind(this.state.orgId)
      .first<{ cnt: number }>();
    return result?.cnt ?? 0;
  }

  private broadcast(msg: AgentOutbound): void {
    const str = JSON.stringify(msg);
    for (const conn of this.getConnections()) {
      conn.send(str);
    }
  }
}
