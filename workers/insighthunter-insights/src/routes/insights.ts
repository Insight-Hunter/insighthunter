
import { Hono } from 'hono'
import type { Env, SessionData } from '../types'

const app = new Hono<{ Bindings: Env; Variables: { session: SessionData } }>()

app.post('/', async (c) => {
  const body = await c.req.json<{ financials: any }>()

  const prompt = `Given this small business financial summary: ${JSON.stringify(body.financials)},
provide exactly 3 concise CFO-level observations. Each should be actionable and specific.
Return ONLY a JSON array: [{"icon":"emoji","text":"observation under 25 words"}]`

  const response = await c.env.AI.run(
    '@cf/meta/llama-3-8b-instruct',
    { prompt }
  )

  return c.json(JSON.parse(response as string))
})

export default app
