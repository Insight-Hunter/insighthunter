
import { Hono } from 'hono'
import type { Env, SessionData } from '../types'

const app = new Hono<{ Bindings: Env; Variables: { session: SessionData } }>()

app.get('/', (c) => {
  return c.json({ message: 'search' })
})

export default app
