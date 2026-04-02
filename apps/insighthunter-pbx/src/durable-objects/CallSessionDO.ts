// apps/insighthunter-pbx/src/durable-objects/CallSessionDO.ts
// Per-org WebSocket hub using Durable Object Hibernation API.
// One DO instance per org — created lazily on first connection.
//
// Endpoints handled internally (via stub.fetch from index.ts):
//   GET  /          → WebSocket upgrade (dashboard clients)
//   POST /broadcast → fan-out event to all connected clients (from webhook handler)
//   GET  /status    → active session count (health / admin)

import type { Env } from '../index';

interface ActiveCall {
  callLegId:  string;
  from:       string;
  to:         string;
  direction:  'inbound' | 'outbound';
  startedAt:  string;
  status:     'ringing' | 'active' | 'holding' | 'ended';
}

// Metadata attached to each WebSocket so we can tag/filter on hibernation restore
interface WsTag {
  connectedAt: string;
  userId?:     string;
}

export class CallSessionDO implements DurableObject {
  private state: DurableObjectState;
  private env:   Env;

  // In-memory call state (lost on eviction — acceptable, rebuilt from next webhook)
  private activeCalls = new Map<string, ActiveCall>();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env   = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/':
      case '/ws':
        return this.handleUpgrade(request);

      case '/broadcast':
        return this.handleBroadcast(request);

      case '/status':
        return this.handleStatus();

      default:
        return new Response('Not found', { status: 404 });
    }
  }

  // ── WebSocket upgrade ───────────────────────────────────────────────────────
  // Dashboard clients connect here for live call events.
  // Uses the Hibernation API so the DO sleeps between messages — zero idle cost.
  private handleUpgrade(request: Request): Response {
    const upgrade = request.headers.get('upgrade');
    if (upgrade?.toLowerCase() !== 'websocket')
      return new Response('Expected WebSocket upgrade', { status: 426 });

    const userId = new URL(request.url).searchParams.get('userId') ?? undefined;

    const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];

    // Tag carries metadata across hibernation cycles
    const tag: WsTag = { connectedAt: new Date().toISOString(), userId };
    this.state.acceptWebSocket(server, [JSON.stringify(tag)]);

    // Send current active calls snapshot immediately on connect
    server.send(JSON.stringify({
      type:        'snapshot',
      activeCalls: Array.from(this.activeCalls.values()),
      ts:          Date.now(),
    }));

    return new Response(null, { status: 101, webSocket: client });
  }

  // ── Broadcast from webhook handler ─────────────────────────────────────────
  // Called by index.ts via DO stub after every Telnyx webhook event.
  // Updates in-memory call state, then fans out to all connected WebSocket clients.
  private async handleBroadcast(request: Request): Promise<Response> {
    const { event_type, payload } = await request.json<{
      event_type: string;
      payload:    Record<string, string | number | undefined>;
    }>();

    // ── Maintain in-memory active call map ─────────────────────────────────
    const callId = (payload.call_leg_id ?? payload.call_session_id ?? '') as string;

    if (callId) {
      if (event_type === 'call.initiated' || event_type === 'call.ringing') {
        this.activeCalls.set(callId, {
          callLegId: callId,
          from:      (payload.from  ?? '') as string,
          to:        (payload.to    ?? '') as string,
          direction: ((payload.direction ?? 'inbound') as 'inbound' | 'outbound'),
          startedAt: new Date().toISOString(),
          status:    event_type === 'call.ringing' ? 'ringing' : 'ringing',
        });
      } else if (event_type === 'call.answered') {
        const existing = this.activeCalls.get(callId);
        if (existing) existing.status = 'active';
      } else if (event_type === 'call.hold') {
        const existing = this.activeCalls.get(callId);
        if (existing) existing.status = 'holding';
      } else if (event_type === 'call.unhold') {
        const existing = this.activeCalls.get(callId);
        if (existing) existing.status = 'active';
      } else if (event_type === 'call.hangup') {
        this.activeCalls.delete(callId);
      }
    }

    // ── Build outbound message ─────────────────────────────────────────────
    const message = JSON.stringify({
      type:        event_type,
      payload,
      activeCalls: Array.from(this.activeCalls.values()),
      ts:          Date.now(),
    });

    // ── Fan-out to all hibernated sockets ──────────────────────────────────
    const sockets = this.state.getWebSockets();
    let   sent    = 0;

    for (const ws of sockets) {
      try {
        ws.send(message);
        sent++;
      } catch (e) {
        // Socket closed between getWebSockets() and send — safe to ignore
        console.warn('CallSessionDO: stale socket skipped', e);
      }
    }

    return new Response(JSON.stringify({ ok: true, recipients: sent }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Status endpoint ─────────────────────────────────────────────────────────
  private handleStatus(): Response {
    return new Response(JSON.stringify({
      connections: this.state.getWebSockets().length,
      activeCalls: Array.from(this.activeCalls.values()),
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  // ── Hibernation callbacks ───────────────────────────────────────────────────
  // Called by the Workers runtime — no need to register listeners manually.

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    // Parse inbound messages from dashboard clients
    // Currently supports: ping keepalive, future: DTMF inject, hold/transfer
    try {
      const data = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message)) as {
        type: string;
        payload?: unknown;
      };

      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        return;
      }

      // Echo unhandled message types back with an error
      ws.send(JSON.stringify({ type: 'error', error: `Unknown message type: ${data.type}` }));
    } catch {
      ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON' }));
    }
  }

  webSocketClose(ws: WebSocket, code: number, reason: string): void {
    // Close gracefully — nothing to clean up since we use getWebSockets() dynamically
    try { ws.close(code, reason); } catch { /* already closed */ }
  }

  webSocketError(ws: WebSocket, error: unknown): void {
    console.error('CallSessionDO WebSocket error:', error);
    try { ws.close(1011, 'Internal error'); } catch { /* already closed */ }
  }
}

