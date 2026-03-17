import { Hono } from 'hono'
import { cors } from 'hono/cors'

interface Env {
  // Add bindings here
}

const app = new Hono<{ Bindings: Env }>()
app.use('*', cors())

// TODO: implement /api/reports routes
app.get('/', (c) => c.json({ service: '/api/reports', status: 'ok' }))

export default app
