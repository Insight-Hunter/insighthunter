import { DurableObject } from "@cloudflare/workers-types";
import type { Env, ReconciliationSession } from "../types.js";

interface ReconciliationState {
  sessionId: string;
  orgId: string;
  clearedTransactionIds: string[];
  clearedTotal: number;
}

// One ReconciliationAgent per reconciliation session
// Tracks cleared/uncleared items with strong consistency
export class ReconciliationAgent extends DurableObject<Env> {
  private state: ReconciliationState = {
    sessionId: "",
    orgId: "",
    clearedTransactionIds: [],
    clearedTotal: 0,
  };

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
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string): Promise<void> {
    const msg = JSON.parse(message) as { type: string; txId?: string };
    if (msg.type === "clear" && msg.txId) {
      await this.toggleCleared(msg.txId, true);
    } else if (msg.type === "unclear" && msg.txId) {
      await this.toggleCleared(msg.txId, false);
    }
    this.broadcastState();
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string
  ): Promise<void> {
    ws.close(code, reason);
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
    amount?: number
  ): Promise<void> {
    const ids = this.state.clearedTransactionIds;
    if (clear && !ids.includes(txId)) {
      ids.push(txId);
      this.state.clearedTotal += amount ?? 0;
    } else if (!clear) {
      const idx = ids.indexOf(txId);
      if (idx > -1) {
        ids.splice(idx, 1);
        this.state.clearedTotal -= amount ?? 0;
      }
    }
    await this.ctx.storage.put("state", this.state);

    // Persist cleared status to D1
    await this.env.DB.prepare(
      `UPDATE reconciliation_matches SET is_cleared=?, cleared_at=?
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
