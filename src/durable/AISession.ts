import type { Env } from '../index'

type Message = { role: 'user' | 'assistant' | 'system'; content: string }

/**
 * AISession — Durable Object
 * Maintains per-user CFO chat conversation history.
 * Keyed by userId — one instance per user.
 * Stores last 20 messages in DO storage for context continuity.
 */
export class AISession {
  private state: DurableObjectState
  private env:   Env
  private history: Message[] = []

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env   = env
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // ── Load history on first access ─────────────────────────
    if (!this.history.length) {
      this.history = (await this.state.storage.get<Message[]>('history')) ?? []
    }

    // ── POST /chat — send a message ──────────────────────────
    if (url.pathname.endsWith('/chat') && request.method === 'POST') {
      const { question, context, systemPrompt } = await request.json<any>()
      if (!question) return new Response(JSON.stringify({ error: 'question required' }), { status: 400 })

      // Build messages array with history for context
      const messages: Message[] = [
        {
          role: 'system',
          content: systemPrompt ?? `You are a CFO assistant for a small business owner.
Be concise, data-driven, and actionable. Respond in 2-4 sentences max.
Financial context: ${context ?? 'No data provided.'}`,
        },
        ...this.history.slice(-10), // last 5 exchanges (10 messages)
        { role: 'user', content: question },
      ]

      try {
        const result = await this.env.AI.run(
          this.env.AI_MODEL as any,
          { messages, max_tokens: 350 }
        ) as any

        const answer = result?.response ?? 'I could not generate a response. Please try again.'

        // Update history
        this.history.push({ role: 'user', content: question })
        this.history.push({ role: 'assistant', content: answer })
        // Keep last 20 messages (10 exchanges)
        if (this.history.length > 20) this.history = this.history.slice(-20)
        await this.state.storage.put('history', this.history)

        return new Response(JSON.stringify({ answer, history_length: this.history.length }), {
          headers: { 'Content-Type': 'application/json' },
        })
      } catch (e) {
        console.error('[AISession] AI error:', e)
        return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // ── GET /history ──────────────────────────────────────────
    if (url.pathname.endsWith('/history') && request.method === 'GET') {
      return new Response(JSON.stringify({ history: this.history }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // ── DELETE /history — clear conversation ─────────────────
    if (url.pathname.endsWith('/history') && request.method === 'DELETE') {
      this.history = []
      await this.state.storage.delete('history')
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response('Not found', { status: 404 })
  }
}
