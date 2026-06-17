import type { Env, ReconciliationState } from "../types";

export class ReconciliationAgent extends DurableObject<Env> {
  private state: ReconciliationState = {
    sessionId: "",
    orgId: "",
    clearedTransactionIds: [],
    clearedTotal: 0,
  };

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      return this.handleWebSocket(request);
    }
    if (url.pathname === "/init" && request.method === "POST") {
      return this.handleInit(request);
    }
    if (url.pathname === "/clear" && request.method === "POST") {
      return this.handleClear(request);
    }
    if (url.pathname === "/unclear" && request.method === "POST") {
      return this.handleUnclear(request);
    }
    if (url.pathname === "/complete" && request.method === "POST") {
      return this.handleComplete(request);
    }

    return new Response("Not found", { status: 404 });
  }

  private handleWebSocket(request: Request): Response {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.ctx.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(_ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const text =
      typeof message === "string"
        ? message
        : new TextDecoder().decode(message);

    const msg = JSON.parse(text) as { type: string; txId?: string; amount?: number };

    if (msg.type === "clear" && msg.txId) {
      await this.toggleCleared(msg.txId, true, msg.amount);
    } else if (msg.type === "unclear" && msg.txId) {
      await this.toggleCleared(msg.txId, false, msg.amount);
    }

    this.broadcastState();
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    try {
      ws.close(code, reason);
    } catch {
      // noop
    }
  }

  private async handleInit(request: Request): Promise<Response> {
    const body = (await request.json()) as {
      sessionId: string;
      orgId: string;
    };

    this.state = {
      sessionId: body.sessionId,
      orgId: body.orgId,
      clearedTransactionIds: [],
      clearedTotal: 0,
    };

    await this.ctx.storage.put("state", this.state);

    return Response.json({ ok: true });
  }

  private async handleClear(request: Request): Promise<Response> {
    const { txId, amount } = (await request.json()) as {
      txId: string;
      amount: number;
    };

    await this.toggleCleared(txId, true, amount);
    this.broadcastState();

    return Response.json({ clearedTotal: this.state.clearedTotal });
  }

  private async handleUnclear(request: Request): Promise<Response> {
    const { txId, amount } = (await request.json()) as {
      txId: string;
      amount: number;
    };

    await this.toggleCleared(txId, false, amount);
    this.broadcastState();

    return Response.json({ clearedTotal: this.state.clearedTotal });
  }

  private async handleComplete(request: Request): Promise<Response> {
    const { statementBalance } = (await request.json()) as {
      statementBalance: number;
    };

    const difference =
      Math.round((statementBalance - this.state.clearedTotal) * 100) / 100;
    const status = Math.abs(difference) < 0.01 ? "completed" : "discrepancy";

    await this.env.DB.prepare(
      `UPDATE reconciliation_sessions
       SET status=?, cleared_balance=?, difference=?, completed_at=?
       WHERE id=?`
    )
      .bind(
        status,
        this.state.clearedTotal,
        difference,
        new Date().toISOString(),
        this.state.sessionId
      )
      .run();

    return Response.json({ status, difference });
  }

  private async toggleCleared(
    txId: string,
    clear: boolean,
    amount = 0
  ): Promise<void> {
    const ids = this.state.clearedTransactionIds;

    if (clear && !ids.includes(txId)) {
      ids.push(txId);
      this.state.clearedTotal += amount;
    } else if (!clear) {
      const idx = ids.indexOf(txId);
      if (idx > -1) {
        ids.splice(idx, 1);
        this.state.clearedTotal -= amount;
      }
    }

    await this.ctx.storage.put("state", this.state);

    await this.env.DB.prepare(
      `UPDATE reconciliation_matches
       SET is_cleared=?, cleared_at=?
       WHERE session_id=? AND transaction_id=?`
    )
      .bind(
        clear ? 1 : 0,
        clear ? new Date().toISOString() : null,
        this.state.sessionId,
        txId
      )
      .run();
  }

  private broadcastState(): void {
    const msg = JSON.stringify({
      type: "state_update",
      clearedTotal: this.state.clearedTotal,
      clearedCount: this.state.clearedTransactionIds.length,
    });

    for (const ws of this.ctx.getWebSockets()) {
      ws.send(msg);
    }
  }
}
