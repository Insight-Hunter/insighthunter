// Trusted tenant resolution for provider webhooks. Per
// docs/insight-pbx-master-prompt.md §3.2/§7.3: "Do not trust Twilio webhook
// payload fields as tenant authorization. Resolve a trusted mapping from
// destination number, provider resource identity, or signed metadata to the
// tenant."

export interface TenantResolution {
  orgId: string;
  /** False when the org was recovered from an unverified fallback (e.g. a
   * console-configured query param) because no number mapping exists yet. */
  verified: boolean;
}

/**
 * Resolves the tenant that owns `toNumber` using the trusted
 * `phone_numbers` mapping table. Falls back to the `org` query parameter
 * (set by the admin when configuring the Twilio console webhook URL, and
 * covered by the Twilio request signature) only when no number has been
 * provisioned into the mapping table yet. Callers must treat an unverified
 * resolution as lower-trust and should log it.
 */
export async function resolveTenantForNumber(
  db: D1Database,
  toNumber: string | null,
  fallbackOrgId: string | null,
): Promise<TenantResolution | null> {
  if (toNumber) {
    const row = await db
      .prepare("SELECT org_id FROM phone_numbers WHERE phone_number = ?1")
      .bind(toNumber)
      .first<{ org_id: string }>();
    if (row) return { orgId: row.org_id, verified: true };
  }
  if (fallbackOrgId) return { orgId: fallbackOrgId, verified: false };
  return null;
}
