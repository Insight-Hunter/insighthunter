import type { Env } from './index'

export const cronHandler: ExportedHandlerScheduledHandler<Env> = async (event, env, ctx) => {
  const cron = event.cron
  console.log(`[CRON] Triggered: ${cron}`)

  // Monday 8am — weekly summary emails
  if (cron === '0 8 * * 1') {
    ctx.waitUntil(sendWeeklySummaries(env))
  }

  // 1st of month — monthly P&L report
  if (cron === '0 9 1 * *') {
    ctx.waitUntil(sendMonthlyReports(env))
  }

  // Daily — compliance deadline check
  if (cron === '0 12 * * *') {
    ctx.waitUntil(checkComplianceDeadlines(env))
  }
}

async function sendWeeklySummaries(env: Env) {
  const users = await env.DB.prepare(
    `SELECT u.id, u.email, u.name FROM users u
     WHERE u.deleted_at IS NULL AND u.plan != 'free'`
  ).all()
  for (const user of users.results as any[]) {
    await env.EMAIL_QUEUE.send({ type: 'weekly_summary', userId: user.id, email: user.email })
  }
}

async function sendMonthlyReports(env: Env) {
  const users = await env.DB.prepare(
    `SELECT id, email FROM users WHERE deleted_at IS NULL`
  ).all()
  for (const user of users.results as any[]) {
    await env.EMAIL_QUEUE.send({ type: 'monthly_report', userId: (user as any).id })
  }
}

async function checkComplianceDeadlines(env: Env) {
  const today    = new Date()
  const deadline = new Date(today); deadline.setDate(today.getDate() + 7)
  const rows = await env.DB.prepare(
    `SELECT fc.*, u.email FROM formation_compliance fc
     JOIN formations f ON fc.formation_id=f.id
     JOIN users u ON f.user_id=u.id
     WHERE fc.due_date BETWEEN ? AND ? AND fc.completed_at IS NULL`
  ).bind(today.toISOString().slice(0,10), deadline.toISOString().slice(0,10)).all()
  for (const row of rows.results as any[]) {
    await env.EMAIL_QUEUE.send({ type: 'compliance_reminder', email: row.email, item: row.title, due: row.due_date })
  }
}
