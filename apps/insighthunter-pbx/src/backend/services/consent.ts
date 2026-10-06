// Messaging compliance: STOP/START/HELP keyword handling and outbound
// suppression enforcement (docs/insight-pbx-master-prompt.md §8.2, §12.1).

const STOP_KEYWORDS = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit"]);
const START_KEYWORDS = new Set(["start", "yes", "unstop"]);
const HELP_KEYWORDS = new Set(["help", "info"]);

export type SuppressionKeyword = "stop" | "start" | "help" | null;

export function classifyKeyword(body: string): SuppressionKeyword {
  const normalized = body.trim().toLowerCase();
  if (STOP_KEYWORDS.has(normalized)) return "stop";
  if (START_KEYWORDS.has(normalized)) return "start";
  if (HELP_KEYWORDS.has(normalized)) return "help";
  return null;
}

export async function isSuppressed(db: D1Database, orgId: string, phoneNumber: string) {
  const row = await db
    .prepare("SELECT 1 FROM message_suppressions WHERE org_id = ?1 AND phone_number = ?2")
    .bind(orgId, phoneNumber)
    .first();
  return row !== null;
}

export async function recordOptOut(db: D1Database, orgId: string, phoneNumber: string) {
  await db
    .prepare(
      `INSERT INTO message_suppressions (org_id, phone_number, reason, created_at)
       VALUES (?1, ?2, 'stop', ?3)
       ON CONFLICT(org_id, phone_number) DO UPDATE SET reason = 'stop', created_at = ?3`,
    )
    .bind(orgId, phoneNumber, new Date().toISOString())
    .run();
}

export async function recordOptIn(db: D1Database, orgId: string, phoneNumber: string) {
  await db
    .prepare("DELETE FROM message_suppressions WHERE org_id = ?1 AND phone_number = ?2")
    .bind(orgId, phoneNumber)
    .run();
}
