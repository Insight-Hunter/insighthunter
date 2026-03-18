import type { Env } from './index'

export const queueHandler: ExportedHandlerQueueHandler<Env> = async (batch, env) => {
  for (const msg of batch.messages) {
    const body = msg.body as any
    try {
      if (batch.queue === 'insighthunter-email')   await handleEmail(body, env)
      if (batch.queue === 'insighthunter-payroll') await handlePayroll(body, env)
      if (batch.queue === 'insighthunter-exports') await handleExport(body, env)
      msg.ack()
    } catch (e) {
      console.error(`[QUEUE] Error on ${batch.queue}:`, e)
      msg.retry()
    }
  }
}

async function handleEmail(body: any, env: Env) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Insight Hunter <noreply@insighthunter.com>',
      to:      [body.email],
      subject: body.type === 'weekly_summary' ? 'Your Weekly Financial Summary' :
               body.type === 'monthly_report' ? 'Your Monthly P&L Report is Ready' :
               `Compliance Reminder: ${body.item}`,
      html:    buildEmailHTML(body),
    }),
  })
  if (!res.ok) throw new Error(`Resend error: ${res.status}`)
}

async function handlePayroll(body: any, env: Env) {
  // Process payroll run — calculate net pay, taxes, write paystubs to R2
  console.log(`[PAYROLL] Processing run ${body.runId}`)
}

async function handleExport(body: any, env: Env) {
  // Generate CSV/PDF export and store in R2, then email download link
  console.log(`[EXPORT] Generating export for user ${body.userId}`)
}

function buildEmailHTML(body: any): string {
  return `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0D1117;color:#E2E8F0;padding:2rem;border-radius:12px">
    <div style="font-size:1.1rem;font-weight:800;color:#C9972B;margin-bottom:1rem">Insight Hunter</div>
    <p>Hello,</p>
    <p>${body.type === 'weekly_summary' ? 'Your weekly financial summary is ready. Log in to view your full report.' :
        body.type === 'monthly_report'  ? 'Your monthly P&L report has been generated.' :
        `Your compliance item "<strong>${body.item}</strong>" is due on ${body.due}.`}</p>
    <a href="https://app.insighthunter.com" style="display:inline-block;background:#C9972B;color:#0D1117;padding:.65rem 1.25rem;border-radius:8px;font-weight:700;text-decoration:none;margin-top:1rem">Open Dashboard →</a>
  </div>`
}
