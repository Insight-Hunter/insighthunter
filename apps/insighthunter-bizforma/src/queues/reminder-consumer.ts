// Reminder Queue Consumer
// Processes compliance reminder jobs from insighthunter-bizforma-reminders queue.
// Sprint 3 will wire actual email/push notification via insighthunter-notifications service.

import type { BizformaEnv } from "../types.js";

export interface ReminderJob {
  type: "compliance_reminder" | "deadline_alert" | "overdue_notice";
  case_id: string;
  event_id: string;
  user_id: string;
  tenant_id: string;
  due_date: string;
  event_title: string;
  days_until_due: number;
}

export async function processReminderBatch(
  batch: MessageBatch<ReminderJob>,
  env: BizformaEnv
): Promise<void> {
  for (const msg of batch.messages) {
    const job = msg.body;
    try {
      console.log(`[reminder-consumer] type=${job.type} case=${job.case_id} event=${job.event_id} due=${job.due_date}`);

      // Mark reminder as sent in DB
      await env.DB.prepare(
        `UPDATE compliance_events SET reminder_sent = 1, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?`
      ).bind(job.event_id, job.tenant_id).run();

      // Track analytics
      env.ANALYTICS.writeDataPoint({
        blobs: [job.tenant_id, job.case_id, job.event_id, job.type],
        doubles: [job.days_until_due],
        indexes: ["compliance_reminder_sent"],
      });

      // Sprint 3: forward to insighthunter-notifications Worker via service binding
      // await env.NOTIFICATIONS.fetch(new Request('https://notifications/send', {
      //   method: 'POST',
      //   body: JSON.stringify({ user_id: job.user_id, title: job.event_title, due_date: job.due_date }),
      // }));

      msg.ack();
    } catch (err) {
      console.error(`[reminder-consumer] failed for event ${job.event_id}:`, err);
      msg.retry({ delaySeconds: 300 });
    }
  }
}

// Scheduled trigger — dispatches upcoming compliance reminders to queue
// Wire this to a cron trigger: 0 9 * * * (daily at 9am UTC)
export async function dispatchUpcomingReminders(env: BizformaEnv): Promise<void> {
  const today = new Date();
  const thresholds = [1, 7, 14, 30]; // days before due date to remind

  for (const days of thresholds) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + days);
    const dateStr = targetDate.toISOString().split("T")[0];

    const { results } = await env.DB.prepare(
      `SELECT ce.id, ce.formation_case_id, ce.tenant_id, ce.event_type, ce.title, ce.due_date,
              fc.user_id
       FROM compliance_events ce
       JOIN formation_cases fc ON fc.id = ce.formation_case_id
       WHERE ce.due_date = ? AND ce.status = 'pending' AND ce.reminder_sent = 0`
    ).bind(dateStr).all<{
      id: string; formation_case_id: string; tenant_id: string;
      event_type: string; title: string; due_date: string; user_id: string;
    }>();

    for (const event of results) {
      const job: ReminderJob = {
        type: days === 1 ? "deadline_alert" : "compliance_reminder",
        case_id: event.formation_case_id,
        event_id: event.id,
        user_id: event.user_id,
        tenant_id: event.tenant_id,
        due_date: event.due_date,
        event_title: event.title,
        days_until_due: days,
      };
      await env.REMINDER_QUEUE.send(job);
    }

    console.log(`[reminder-dispatcher] queued ${results.length} reminders for ${dateStr} (${days}d threshold)`);
  }
}
