// Notification helpers — CF Email Service (SEND_EMAIL binding) + in-app via D1

// Cloudflare Email Service binding interface
export interface SendEmailBinding {
  send(message: {
    to: { email: string; name?: string }[];
    from: { email: string; name?: string };
    subject: string;
    html?: string;
    text?: string;
  }): Promise<void>;
}

export type NotificationSeverity = "info" | "warning" | "critical";

// Send transactional email via Cloudflare Email Service binding
// The binding is injected from env (SEND_EMAIL) — no API key needed
export async function sendEmail(opts: {
  binding: SendEmailBinding;
  to: string;
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
}): Promise<boolean> {
  try {
    await opts.binding.send({
      to: [{ email: opts.to }],
      from: {
        email: opts.from ?? "noreply@insighthunter.app",
        name: opts.fromName ?? "InsightHunter",
      },
      subject: opts.subject,
      html: opts.html,
    });
    return true;
  } catch {
    return false;
  }
}

export async function createInAppNotification(
  db: D1Database,
  orgId: string,
  userId: string,
  title: string,
  message: string,
  severity: NotificationSeverity = "info",
  appId?: string,
  link?: string,
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO notifications (id, org_id, user_id, title, message, severity, app_id, link) VALUES (?,?,?,?,?,?,?,?)",
    )
    .bind(crypto.randomUUID(), orgId, userId, title, message, severity, appId ?? null, link ?? null)
    .run();
}

export async function getUnreadNotifications(
  db: D1Database,
  userId: string,
  orgId: string,
): Promise<
  {
    id: string;
    title: string;
    message: string;
    severity: string;
    link: string | null;
    created_at: number;
  }[]
> {
  const { results } = await db
    .prepare(
      "SELECT id, title, message, severity, link, created_at FROM notifications WHERE user_id = ? AND org_id = ? AND read_at IS NULL ORDER BY created_at DESC LIMIT 20",
    )
    .bind(userId, orgId)
    .all();
  return results as never;
}

export async function markNotificationRead(
  db: D1Database,
  notificationId: string,
  userId: string,
): Promise<void> {
  await db
    .prepare("UPDATE notifications SET read_at = unixepoch() WHERE id = ? AND user_id = ?")
    .bind(notificationId, userId)
    .run();
}
