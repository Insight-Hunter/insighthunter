import type { Env } from '../index'

/**
 * PBXRoom — Durable Object
 * Manages a real-time WebSocket room per phone number.
 * Each active number gets one PBXRoom instance (keyed by phone number).
 * Handles live call status, push notifications to connected dashboard tabs.
 */
export class PBXRoom {
  private state:   DurableObjectState
  private env:     Env
  private sessions: Set<WebSocket> = new Set()

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env   = env
    // Restore any hibernated WebSocket sessions
    this.state.getWebSockets().forEach(ws => this.sessions.add(ws))
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // ── WebSocket upgrade ────────────────────────────────────
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)
      this.state.acceptWebSocket(server)
      this.sessions.add(server)
      return new Response(null, { status: 101, webSocket: client })
    }

    // ── Broadcast a call/SMS event to all connected tabs ─────
    if (url.pathname.endsWith('/broadcast') && request.method === 'POST') {
      const event = await request.json()
      this.broadcast(event)
      return new Response(JSON.stringify({ ok: true, recipients: this.sessions.size }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // ── Room status ───────────────────────────────────────────
    if (url.pathname.endsWith('/status')) {
      return new Response(JSON.stringify({
        connections: this.sessions.size,
        id: this.state.id.toString(),
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    return new Response('Not found', { status: 404 })
  }

  // ── WebSocket message handler ─────────────────────────────
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const data = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message))
      // Echo ping → pong for keepalive
      if (data.type === 'ping') ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }))
    } catch { /* ignore malformed */ }
  }

  // ── WebSocket close handler ───────────────────────────────
  webSocketClose(ws: WebSocket) {
    this.sessions.delete(ws)
  }

  // ── WebSocket error handler ───────────────────────────────
  webSocketError(ws: WebSocket) {
    this.sessions.delete(ws)
  }

  // ── Broadcast to all open sessions ───────────────────────
  private broadcast(event: unknown) {
    const msg = JSON.stringify(event)
    const dead: WebSocket[] = []
    this.sessions.forEach(ws => {
      try {
        ws.send(msg)
      } catch {
        dead.push(ws)
      }
    })
    dead.forEach(ws => this.sessions.delete(ws))
  }
}
