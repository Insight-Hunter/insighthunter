// queues/reminder-consumer.ts — Processes reminder jobs from the queue
import type { BizformaEnv } from "../types.js";

export interface ReminderJob {
  type: "compliance_reminder";
  case_id: string;
  event_id: string;
  user_id: string;
  org_id: string;
  due_date: string;
  title: string;
}

export async function processReminderBatch(
  batch: MessageBatch<ReminderJob>,
  env: BizformaEnv,
): Promise<void> {
  for (const msg of batch.messages) {
    const job = msg.body;
    try {
      console.log(`[reminders] Sending reminder: ${job.title} due ${job.due_date}`);

      // Write notification to platform DB (cross-worker)
      await env.DB.prepare(`
        INSERT OR IGNORE INTO notifications
          (id, org_id, user_id, title, body, type, read, created_at)
        VALUES (?1,?2,?3,?4,?5,'warning',0,datetime('now'))
      `)
        .bind(
          crypto.randomUUID(),
          job.org_id,
          job.user_id,
          `Compliance Due: ${job.title}`,
          `Action required by ${job.due_date}`,
        )
        .run();

      env.ANALYTICS.writeDataPoint({
        blobs: [job.org_id, job.event_id, "reminder_sent"],
        indexes: ["compliance_reminder"],
      });

      msg.ack();
    } catch (err) {
      console.error(`[reminders] Failed for event ${job.event_id}:`, err);
      msg.retry();
    }
  }
}

export async function dispatchUpcomingReminders(env: BizformaEnv): Promise<void> {
  const cutoff = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];

  const result = await env.DB.prepare(`
    SELECT e.*, e.id AS event_id, c.org_id, c.user_id
    FROM bizforma_compliance_events e
    JOIN bizforma_cases c ON c.id = e.case_id
    WHERE e.status = 'pending' AND e.due_date <= ?1
  `)
    .bind(cutoff)
    .all<ReminderJob & { user_id: string; org_id: string }>();

  const jobs = result.results ?? [];
  console.log(`[reminders] Dispatching ${jobs.length} reminders`);

  for (const job of jobs) {
    await env.REMINDER_QUEUE.send({
      type: "compliance_reminder",
      case_id: job.case_id,
      event_id: job.event_id,
      user_id: job.user_id,
      org_id: job.org_id,
      due_date: job.due_date,
      title: job.title,
    } as ReminderJob);
  }
}
