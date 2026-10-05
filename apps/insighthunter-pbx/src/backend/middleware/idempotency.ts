// Webhook delivery idempotency (Twilio may redeliver on timeout/retry).

export async function isDuplicateWebhookEvent(
  db: D1Database,
  provider: string,
  eventId: string,
): Promise<boolean> {
  const existing = await db
    .prepare("SELECT 1 FROM processed_webhook_events WHERE provider = ?1 AND event_id = ?2")
    .bind(provider, eventId)
    .first();
  if (existing) return true;

  try {
    await db
      .prepare(
        "INSERT INTO processed_webhook_events (provider, event_id, received_at) VALUES (?1, ?2, ?3)",
      )
      .bind(provider, eventId, new Date().toISOString())
      .run();
    return false;
  } catch {
    // Unique constraint race: another concurrent delivery won.
    return true;
  }
}
