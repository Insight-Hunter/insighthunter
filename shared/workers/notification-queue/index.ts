// shared/workers/notification-queue/index.ts
// ih-notification-queue — central async notification dispatcher.
// Consumed by ALL InsightHunter apps via queue bindings.
// Supports: in-app alerts, email (via Resend), webhook push.

export interface NotificationPayload {
  orgId: string;
  userId?: string;           // null = org-wide broadcast
  firmId?: string;
  type:
    | "alert_created"
    | "task_due"
    | "approval_needed"
    | "close_ready"
    | "anomaly_detected"
    | "invoice_overdue"
    | "reimbursement_approved"
    | "document_ready"
    | "compliance_deadline";
  title: string;
  body: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  channels: ("in_app" | "email" | "webhook")[];
}

export interface Env {
  DB: D1Database;                       // ih-notifications D1 — alerts store
  RESEND_API_KEY: string;               // Email sender key
  RESEND_FROM: string;                  // noreply@insighthunter.app
  WEBHOOK_SIGNING_SECRET: string;
  ENVIRONMENT: string;
}

// Queue consumer — processes notification jobs sent by any app worker
export default {
  async queue(batch: MessageBatch<NotificationPayload>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      const n = msg.body;
      try {
        // 1. Always persist to in-app alerts table
        const alertId = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO advisor_alerts
             (id, org_id, user_id, firm_id, type, title, body, action_url, metadata, read, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))`
        )
          .bind(
            alertId,
            n.orgId,
            n.userId ?? null,
            n.firmId ?? null,
            n.type,
            n.title,
            n.body,
            n.actionUrl ?? null,
            n.metadata ? JSON.stringify(n.metadata) : null
          )
          .run();

        // 2. Email channel
        if (n.channels.includes("email") && n.userId) {
          const row = await env.DB.prepare(
            "SELECT email FROM users WHERE id = ? LIMIT 1"
          )
            .bind(n.userId)
            .first<{ email: string }>();

          if (row?.email) {
            await sendEmail(env, row.email, n.title, buildEmailHtml(n));
          }
        }

        // 3. Webhook channel — push to org-registered webhook URL
        if (n.channels.includes("webhook")) {
          const hook = await env.DB.prepare(
            "SELECT url FROM org_webhooks WHERE org_id = ? AND active = 1 LIMIT 1"
          )
            .bind(n.orgId)
            .first<{ url: string }>();

          if (hook?.url) {
            await deliverWebhook(hook.url, n, env.WEBHOOK_SIGNING_SECRET);
          }
        }

        msg.ack();
      } catch (err) {
        console.error("Notification dispatch failed", { type: n.type, orgId: n.orgId, err });
        msg.retry();
      }
    }
  },
} satisfies ExportedHandler<Env>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function sendEmail(env: Env, to: string, subject: string, html: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.RESEND_FROM, to, subject, html }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error ${res.status}: ${text}`);
  }
}

async function deliverWebhook(
  url: string,
  payload: NotificationPayload,
  secret: string
): Promise<void> {
  const body = JSON.stringify(payload);
  const sig = await hmacSign(body, secret);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-IH-Signature": sig,
      "X-IH-Timestamp": String(Date.now()),
    },
    body,
  });
  if (!res.ok) throw new Error(`Webhook delivery failed: ${res.status}`);
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildEmailHtml(n: NotificationPayload): string {
  const actionBlock = n.actionUrl
    ? `<p style="margin:16px 0"><a href="${n.actionUrl}" style="background:#01696f;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">View in InsightHunter</a></p>`
    : "";
  return `<!doctype html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <img src="https://insighthunter.app/logo.png" alt="InsightHunter" width="140" style="margin-bottom:24px">
  <h2 style="margin:0 0 8px;font-size:18px">${n.title}</h2>
  <p style="color:#555;font-size:15px;line-height:1.5">${n.body}</p>
  ${actionBlock}
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#999;font-size:12px">InsightHunter · Kings Mountain, NC · <a href="https://insighthunter.app/unsubscribe">Unsubscribe</a></p>
</body></html>`;
}
