// Notification helpers — email via Resend + in-app via D1 notifications table
export type NotificationSeverity = 'info' | 'warning' | 'critical';

export async function sendEmail(opts: {
  apiKey: string;
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${opts.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: opts.from ?? 'InsightHunter <noreply@insighthunter.app>',
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    });
    return res.ok;
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
  severity: NotificationSeverity = 'info',
  appId?: string,
  link?: string,
): Promise<void> {
  await db
    .prepare('INSERT INTO notifications (id, org_id, user_id, title, message, severity, app_id, link) VALUES (?,?,?,?,?,?,?,?)')
    .bind(crypto.randomUUID(), orgId, userId, title, message, severity, appId ?? null, link ?? null)
    .run();
}

export async function getUnreadNotifications(
  db: D1Database,
  userId: string,
  orgId: string,
): Promise<{ id: string; title: string; message: string; severity: string; link: string | null; created_at: number }[]> {
  const { results } = await db
    .prepare('SELECT id, title, message, severity, link, created_at FROM notifications WHERE user_id = ? AND org_id = ? AND read_at IS NULL ORDER BY created_at DESC LIMIT 20')
    .bind(userId, orgId)
    .all();
  return results as never;
}

export async function markNotificationRead(db: D1Database, notificationId: string, userId: string): Promise<void> {
  await db
    .prepare('UPDATE notifications SET read_at = unixepoch() WHERE id = ? AND user_id = ?')
    .bind(notificationId, userId)
    .run();
}
