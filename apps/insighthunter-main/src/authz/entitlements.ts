export type EntitlementRow = {
  feature_key: string;
  status: string;
  source: string | null;
  expires_at: string | null;
  metadata_json: string | null;
};

export async function listOrganizationEntitlements(
  db: "inighthunter-auth-db",
  organizationId: string,
): Promise<EntitlementRow[]> {
  const result = await db
    .prepare(
      `SELECT feature_key, status, source, expires_at, metadata_json
       FROM entitlements
       WHERE organization_id = ?
       ORDER BY feature_key ASC`,
    )
    .bind(organizationId)
    .all<EntitlementRow>();

  return result.results ?? [];
}

export async function organizationHasEntitlement(
  db: D1Database,
  organizationId: string,
  featureKey: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT feature_key
       FROM entitlements
       WHERE organization_id = ?
         AND feature_key = ?
         AND status = 'active'
       LIMIT 1`,
    )
    .bind(organizationId, featureKey)
    .first<{ feature_key: string }>();

  return Boolean(row?.feature_key);
}
