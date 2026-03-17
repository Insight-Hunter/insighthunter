import { Hono } from 'hono'
import { cors } from 'hono/cors'

interface Env {
  // Add bindings here
}

const app = new Hono<{ Bindings: Env }>()
app.use('*', cors())

// TODO: implement /api/ai routes
app.get('/', (c) => c.json({ service: '/api/ai', status: 'ok' }))

export default app
