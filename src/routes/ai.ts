import { Hono } from 'hono'
import type { Env } from '../index'
import { requireAuth } from '../middleware/auth'

export const aiRoutes = new Hono<{ Bindings: Env }>()
aiRoutes.use('*', requireAuth)

// ── CFO Chat — routes through AISession Durable Object ────────
// Each user gets a persistent DO instance that maintains
// conversation history across sessions (last 10 exchanges).
aiRoutes.post('/chat', async c => {
  const userId = c.get('userId') as string
  const plan   = c.get('userPlan') as string

  if (!['pro', 'business'].includes(plan))
    return c.json({ error: 'AI Chat requires Pro plan or above.' }, 403)

  const { question, context } = await c.req.json<any>()
  if (!question) return c.json({ error: 'question required' }, 400)

  // Route to user's persistent AISession DO
  const sessionId = c.env.AI_SESSION.idFromName(userId)
  const session   = c.env.AI_SESSION.get(sessionId)

  const res = await session.fetch(new Request('https://do/chat', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ question, context }),
  }))

  if (!res.ok) return c.json({ error: 'AI unavailable' }, 503)
  const data = await res.json()

  c.env.ANALYTICS.writeDataPoint({ blobs:['ai_chat'], doubles:[1], indexes:[userId] })
  return c.json(data)
})

// ── Get conversation history ───────────────────────────────────
aiRoutes.get('/history', async c => {
  const userId   = c.get('userId') as string
  const plan     = c.get('userPlan') as string
  if (!['pro','business'].includes(plan)) return c.json({ history: [] })

  const sessionId = c.env.AI_SESSION.idFromName(userId)
  const session   = c.env.AI_SESSION.get(sessionId)
  const res       = await session.fetch(new Request('https://do/history'))
  return c.json(await res.json())
})

// ── Clear chat history ────────────────────────────────────────
aiRoutes.delete('/history', async c => {
  const userId   = c.get('userId') as string
  const sessionId = c.env.AI_SESSION.idFromName(userId)
  const session   = c.env.AI_SESSION.get(sessionId)
  await session.fetch(new Request('https://do/history', { method: 'DELETE' }))
  return c.json({ ok: true })
})

// ── Batch insights (dashboard AI cards) ───────────────────────
aiRoutes.post('/insights', async c => {
  const userId = c.get('userId') as string

  // Available to all plans (computed fallback if AI unavailable)
  const body = await c.req.json<{ financials: any }>()

  const prompt = `Given this small business financial summary: ${JSON.stringify(body.financials)},
provide exactly 3 concise CFO-level observations. Each should be actionable and specific.
Return ONLY a JSON array: [{"icon":"emoji","text":"observation under 25 words"}]`

  try {
    const result = await c.env.AI.run(c.env.AI_MODEL as any, {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
    }) as any

    // Extract JSON from response (model may wrap it in markdown)
    const raw = result.response ?? ''
    const match = raw.match(/\[[\s\S]*?\]/)
    const insights = match ? JSON.parse(match[0]) : []

    c.env.ANALYTICS.writeDataPoint({ blobs:['ai_insights'], doubles:[1], indexes:[userId] })
    return c.json({ insights })
  } catch (e) {
    // Graceful fallback — return empty so frontend uses computed insights
    return c.json({ insights: [] })
  }
})
