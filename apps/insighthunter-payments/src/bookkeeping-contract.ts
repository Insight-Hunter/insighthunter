export type BookkeepingPlan = "standard" | "pro_books";

export type StripeSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete"
  | "incomplete_expired";

export type BookkeepingWebhookEventType =
  | "checkout.session.completed"
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "invoice.paid"
  | "invoice.payment_failed";

export interface BookkeepingCheckoutRequest {
  readonly plan: BookkeepingPlan;
  readonly tenantId: string;
  readonly userId: string;
  readonly correlationId: string;
}

export interface BookkeepingCheckoutConfig {
  readonly standardPriceId: string;
  readonly proBooksPriceId: string;
  readonly successUrl: string;
  readonly cancelUrl: string;
}

export interface CheckoutSessionInput {
  readonly priceId: string;
  readonly successUrl: string;
  readonly cancelUrl: string;
  readonly metadata: Readonly<Record<string, string>>;
  readonly clientReferenceId: string;
}

export interface VerifiedWebhookEvent {
  readonly eventId: string;
  readonly type: BookkeepingWebhookEventType;
  readonly tenantId: string;
  readonly correlationId: string;
  readonly customerId: string | null;
  readonly subscriptionId: string | null;
  readonly subscriptionStatus: StripeSubscriptionStatus | null;
  readonly currentPeriodEnd: string | null;
}

export interface TenantProvisioningRequest {
  readonly tenantId: string;
  readonly requestedBy: string;
  readonly correlationId: string;
  readonly sourceEventId: string;
}

const OPAQUE_ID_PATTERN = /^[a-zA-Z0-9_-]{16,128}$/;

function requireOpaqueId(value: string, field: string): string {
  if (!OPAQUE_ID_PATTERN.test(value)) {
    throw new TypeError(`${field} must be an opaque identifier between 16 and 128 characters.`);
  }

  return value;
}

function requireHttpsUrl(value: string, field: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new TypeError(`${field} must use HTTPS.`);
  }

  return url.toString();
}

export function getBookkeepingPriceId(
  plan: BookkeepingPlan,
  config: BookkeepingCheckoutConfig,
): string {
  const priceId = plan === "standard" ? config.standardPriceId : config.proBooksPriceId;
  if (!priceId || priceId.trim().length < 3) {
    throw new TypeError(`No Stripe price is configured for ${plan}.`);
  }

  return priceId;
}

export function createBookkeepingCheckoutInput(
  request: BookkeepingCheckoutRequest,
  config: BookkeepingCheckoutConfig,
): CheckoutSessionInput {
  const tenantId = requireOpaqueId(request.tenantId, "tenantId");
  const userId = requireOpaqueId(request.userId, "userId");
  const correlationId = requireOpaqueId(request.correlationId, "correlationId");

  return {
    priceId: getBookkeepingPriceId(request.plan, config),
    successUrl: requireHttpsUrl(config.successUrl, "successUrl"),
    cancelUrl: requireHttpsUrl(config.cancelUrl, "cancelUrl"),
    clientReferenceId: tenantId,
    metadata: {
      correlation_id: correlationId,
      plan: request.plan,
      tenant_id: tenantId,
      user_id: userId,
    },
  };
}

export function shouldRequestTenantProvisioning(
  event: VerifiedWebhookEvent,
  tenantIsReady: boolean,
): boolean {
  if (tenantIsReady || event.type !== "checkout.session.completed") {
    return false;
  }

  return event.subscriptionStatus === null || ["active", "trialing"].includes(event.subscriptionStatus);
}
