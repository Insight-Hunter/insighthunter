import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { Env, SessionData } from './types'
import chatRoutes    from './routes/chat'
import insightRoutes from './routes/insights'
import forecastRoutes from './routes/forecast'
import embedRoutes   from './routes/embed'
import searchRoutes  from './routes/search'

export { AISession } from './durable/AISession'

const app = new Hono<{ Bindings: Env; Variables: { session: SessionData } }>()

// ── Middleware ─────────────────────────────────────────────────
app.use('*', logger())

app.use('*', async (c, next) => {
  const origins = c.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  return cors({
    origin:      origins,
    credentials: true,
    allowHeaders:  ['Content-Type', 'Authorization'],
    allowMethods:  ['GET', 'POST', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['X-RateLimit-Remaining'],
  })(c, next)
})


// ── Routes ─────────────────────────────────────────────────────
app.route('/ai/chat',     chatRoutes)
app.route('/ai/insights', insightRoutes)
app.route('/ai/forecast', forecastRoutes)
app.route('/ai/embed',    embedRoutes)
app.route('/ai/search',   searchRoutes)

// ── Health ─────────────────────────────────────────────────────
app.get('/health', (c) => c.json({
  service: 'insighthunter-ai',
  status:  'ok',
  ts:      new Date().toISOString(),
}))

// ── 404 fallback ───────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not found' }, 404))
app.onError((err, c) => {
  console.error('[AI Worker Error]', err.message)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app
