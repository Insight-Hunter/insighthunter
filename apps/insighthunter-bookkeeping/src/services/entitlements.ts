export type Plan = "startup" | "standard" | "pro_books";

export type Feature =
  | "ai_categorization"
  | "accountant_access"
  | "bank_sync"
  | "cash_forecast"
  | "csv_import"
  | "financial_reports"
  | "managed_bookkeeping"
  | "reconciliation"
  | "receipt_capture"
  | "unlimited_accounts";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete"
  | "incomplete_expired";

export interface Entitlement {
  readonly tenantId: string;
  readonly plan: Plan;
  readonly status: SubscriptionStatus;
  readonly features: readonly Feature[];
  readonly currentPeriodEnd: string;
  readonly updatedAt: string;
}

const ACCESSIBLE_STATUSES = new Set<SubscriptionStatus>([
  "active",
  "trialing",
]);

function forbiddenResponse(feature: Feature): Response {
  return new Response(
    JSON.stringify({
      error: "feature_not_available",
      feature,
      message:
        "This feature is not available for the current subscription. Update your plan to continue.",
    }),
    {
      status: 403,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
      },
    },
  );
}

function parsePeriodEnd(value: string): Date | null {
  const periodEnd = new Date(value);
  return Number.isNaN(periodEnd.getTime()) ? null : periodEnd;
}

export function canUseFeature(
  entitlement: Entitlement | null,
  feature: Feature,
  now = new Date(),
): boolean {
  if (!entitlement || !ACCESSIBLE_STATUSES.has(entitlement.status)) {
    return false;
  }

  const periodEnd = parsePeriodEnd(entitlement.currentPeriodEnd);
  if (!periodEnd || periodEnd.getTime() < now.getTime()) {
    return false;
  }

  return entitlement.features.includes(feature);
}

export function requireFeature(
  entitlement: Entitlement | null,
  feature: Feature,
  now = new Date(),
): Entitlement {
  if (!canUseFeature(entitlement, feature, now)) {
    throw forbiddenResponse(feature);
  }

  return entitlement;
}

export function requireTenantEntitlement(
  entitlement: Entitlement | null,
  tenantId: string,
): Entitlement {
  if (!entitlement || entitlement.tenantId !== tenantId) {
    throw new Response(
      JSON.stringify({
        error: "invalid_entitlement_context",
        message: "A valid subscription context is required.",
      }),
      {
        status: 403,
        headers: {
          "cache-control": "no-store",
          "content-type": "application/json; charset=utf-8",
        },
      },
    );
  }

  return entitlement;
}
