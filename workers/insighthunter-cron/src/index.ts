// apps/insighthunter-cron/src/index.ts
// Runs nightly at midnight UTC — downgrades expired plans
export interface Env {
    DB: D1Database
    NOTIFY_EMAIL?: string  // optional admin alert
  }
  
  export default {
    // Triggered by: "0 0 * * *"  (every day at midnight UTC)
    async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
      const now = new Date().toISOString()
      console.log(`[cron] plan-expiry check — ${now}`)
  
      // Find users whose Standard/Lite promo has expired
      const expired = await env.DB.prepare(`
        SELECT id, email, plan, plan_expires, plan_source
        FROM users
        WHERE plan_expires IS NOT NULL
          AND plan_expires < datetime('now')
          AND plan NOT IN ('pro')
      `).all<{ id: string; email: string; plan: string; plan_expires: string; plan_source: string }>()
  
      if (!expired.results?.length) {
        console.log('[cron] No expired plans.')
        return
      }
  
      console.log(`[cron] Downgrading ${expired.results.length} expired plan(s)...`)
  
      // Batch downgrade
      const stmts = expired.results.map(u =>
        env.DB.prepare(`
          UPDATE users
          SET plan = 'free', plan_source = 'expired', plan_expires = NULL, updated_at = datetime('now')
          WHERE id = ?`).bind(u.id)
      )
      await env.DB.batch(stmts)
  
      // Log summary
      expired.results.forEach(u => {
        console.log(`[cron] Downgraded: ${u.email} (was ${u.plan} via ${u.plan_source}, expired ${u.plan_expires})`)
      })
      console.log(`[cron] Done — ${expired.results.length} plan(s) downgraded to free.`)
    },
  
    // Also expose a manual trigger for testing
    async fetch(req: Request, env: Env): Promise<Response> {
      const url = new URL(req.url)
      if (url.pathname === '/run' && req.method === 'POST') {
        await this.scheduled({} as any, env, {} as any)
        return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
      }
      return new Response('Insight Hunter Cron Worker', { status: 200 })
    }
  }
  