import { ACCOUNT_TIERS, MODULE_ADDONS } from "./catalog.js";
import {
  createBillingPortalSession,
  createSubscriptionCheckoutSession,
  getOrCreateCustomer,
  verifyStripeSignature,
} from "./stripe.js";
import type { CheckoutRequest, Env, SessionPayload } from "./types.js";

type StripeSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete"
  | "incomplete_expired";

interface StripeEvent {
  readonly id: string;
  readonly type: string;
  readonly data: {
    readonly object: Record<string, unknown>;
  };
}

interface StripeCheckoutSession extends Record<string, unknown> {
  readonly customer?: string;
  readonly subscription?: string;
  readonly metadata?: {
    readonly type?: string;
    readonly value?: string;
    readonly userId?: string;
    readonly tenant_id?: string;
    readonly correlation_id?: string;
  };
}

interface StripeSubscription extends Record<string, unknown> {
  readonly id?: string;
  readonly status?: StripeSubscriptionStatus;
  readonly current_period_end?: number;
  readonly metadata?: {
    readonly type?: string;
    readonly value?: string;
    readonly userId?: string;
    readonly tenant_id?: string;
    readonly correlation_id?: string;
  };
}

const ALLOWED_SUBSCRIPTION_STATUSES = new Set<StripeSubscriptionStatus>([
  "active",
  "trialing",
]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(env, request),
      });
    }

    try {
      if (url.pathname === "/catalog" && request.method === "GET") {
        return withCors(
          Response.json({
            accountTiers: ACCOUNT_TIERS,
            moduleAddons: MODULE_ADDONS,
          }),
          corsHeaders(env, request),
        );
      }

      if (url.pathname === "/checkout" && request.method === "POST") {
        return withCors(
          await handleCheckout(request, env, requestId),
          corsHeaders(env, request),
        );
      }

      if (url.pathname === "/portal" && request.method === "POST") {
        return withCors(
          await handlePortal(request, env),
          corsHeaders(env, request),
        );
      }

      if (url.pathname === "/webhook" && request.method === "POST") {
        return handleWebhook(request, env, requestId);
      }

      return withCors(
        Response.json(
          { error: "not_found", requestId },
          {
            status: 404,
            headers: { "cache-control": "no-store" },
          },
        ),
        corsHeaders(env, request),
      );
    } catch (error) {
      logSafeError({
        requestId,
        route: url.pathname,
        error,
      });

      return withCors(
        Response.json(
          { error: "internal_error", requestId },
          {
            status: 500,
            headers: { "cache-control": "no-store" },
          },
        ),
        corsHeaders(env, request),
      );
    }
  },
} satisfies ExportedHandler<Env>;

async function handleCheckout(
  request: Request,
  env: Env,
  requestId: string,
): Promise<Response> {
  const session = await requireSession(request, env);
  if (!session) {
    return jsonError("unauthorized", 401, requestId);
  }

  const body = await parseCheckoutRequest(request, requestId);
  if (body instanceof Response) {
    return body;
  }

  const catalog = body.type === "account_tier" ? ACCOUNT_TIERS : MODULE_ADDONS;
  const entry = (catalog as Record<string, (typeof ACCOUNT_TIERS)["pro"]>)[
    body.value
  ];

  if (!entry) {
    return jsonError("unknown_catalog_item", 400, requestId);
  }

  if (entry.monthlyUsd === 0) {
    return jsonError("free_tier_no_checkout_needed", 400, requestId);
  }

  const priceId = (env as unknown as Record<string, string>)[entry.priceEnvKey];
  if (!isStripePriceId(priceId)) {
    logSafeError({
      requestId,
      route: "/checkout",
      errorCode: "missing_or_invalid_price_configuration",
    });

    return jsonError("plan_not_available", 503, requestId);
  }

  const user = await env.DB.prepare(
    "SELECT stripe_customer_id FROM users WHERE id = ?",
  )
    .bind(session.userId)
    .first<{ stripe_customer_id: string | null }>();

  const customerId = await getOrCreateCustomer(
    env,
    session.userId,
    session.email,
    user?.stripe_customer_id ?? null,
  );

  if (!user?.stripe_customer_id) {
    await env.DB.prepare(
      "UPDATE users SET stripe_customer_id = ?, updated_at = ? WHERE id = ?",
    )
      .bind(customerId, Date.now(), session.userId)
      .run();
  }

  const checkoutSession = await createSubscriptionCheckoutSession(env, {
    customerId,
    priceId,
    userId: session.userId,
    type: body.type,
    value: body.value,
    successUrl: `${env.APP_BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${env.APP_BASE_URL}/billing/cancelled`,
  });

  if (!checkoutSession.url) {
    logSafeError({
      requestId,
      route: "/checkout",
      errorCode: "stripe_checkout_url_missing",
    });

    return jsonError("checkout_unavailable", 502, requestId);
  }

  return Response.json(
    { checkoutUrl: checkoutSession.url, requestId },
    { headers: { "cache-control": "no-store" } },
  );
}

async function handlePortal(request: Request, env: Env): Promise<Response> {
  const session = await requireSession(request, env);
  if (!session) {
    return jsonError("unauthorized", 401);
  }

  const user = await env.DB.prepare(
    "SELECT stripe_customer_id FROM users WHERE id = ?",
  )
    .bind(session.userId)
    .first<{ stripe_customer_id: string | null }>();

  if (!user?.stripe_customer_id) {
    return jsonError("no_billing_account", 400);
  }

  const portalSession = await createBillingPortalSession(
    env,
    user.stripe_customer_id,
    `${env.APP_BASE_URL}/dashboard/billing`,
  );

  if (!portalSession.url) {
    return jsonError("portal_unavailable", 502);
  }

  return Response.json(
    { portalUrl: portalSession.url },
    { headers: { "cache-control": "no-store" } },
  );
}

async function handleWebhook(
  request: Request,
  env: Env,
  requestId: string,
): Promise<Response> {
  const signature = request.headers.get("Stripe-Signature");
  const payload = await request.text();

  if (
    !signature ||
    !(await verifyStripeSignature(payload, signature, env.STRIPE_WEBHOOK_SECRET))
  ) {
    logSafeError({
      requestId,
      route: "/webhook",
      errorCode: "invalid_stripe_signature",
    });

    return new Response("invalid signature", { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return new Response("invalid payload", { status: 400 });
  }

  if (!event.id || !event.type || !event.data?.object) {
    return new Response("invalid event", { status: 400 });
  }

  const alreadyProcessed = await env.DB.prepare(
    "SELECT id FROM billing_events WHERE stripe_event_id = ?",
  )
    .bind(event.id)
    .first();

  if (alreadyProcessed) {
    return new Response("ok", { status: 200 });
  }

  const eventObject = event.data.object;
  const userId = getStripeMetadata(eventObject, "userId");
  const now = Date.now();

  try {
    await projectBillingEvent(env, event, userId, now);

    await env.DB.prepare(
      `INSERT INTO billing_events (
        stripe_event_id,
        event_type,
        user_id,
        raw_payload,
        received_at
      ) VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(
        event.id,
        event.type,
        userId,
        JSON.stringify(toBillingEventSummary(event)),
        now,
      )
      .run();
  } catch (error) {
    logSafeError({
      requestId,
      route: "/webhook",
      error,
      errorCode: "stripe_event_projection_failed",
    });

    return new Response("temporary processing failure", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}

async function projectBillingEvent(
  env: Env,
  event: StripeEvent,
  userId: string | null,
  now: number,
): Promise<void> {
  const object = event.data.object;

  switch (event.type) {
    case "checkout.session.completed": {
      const checkout = object as StripeCheckoutSession;
      const metadataUserId = checkout.metadata?.userId ?? userId;

      if (metadataUserId) {
        await grantEntitlement(env, metadataUserId, checkout, now);
      }

      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = object as StripeSubscription;
      const metadataUserId = subscription.metadata?.userId ?? userId;

      if (!metadataUserId) {
        return;
      }

      if (
        subscription.status &&
        ALLOWED_SUBSCRIPTION_STATUSES.has(subscription.status)
      ) {
        await grantEntitlementFromSubscription(
          env,
          metadataUserId,
          subscription,
          now,
        );
      } else {
        await revokeEntitlement(env, subscription, now);
      }

      return;
    }

    case "customer.subscription.deleted": {
      await revokeEntitlement(env, object as StripeSubscription, now);
      return;
    }

    case "invoice.paid":
    case "invoice.payment_failed":
    default:
      return;
  }
}

async function grantEntitlement(
  env: Env,
  userId: string,
  checkout: StripeCheckoutSession,
  now: number,
): Promise<void> {
  const type = checkout.metadata?.type;
  const value = checkout.metadata?.value;
  const subscriptionId =
    typeof checkout.subscription === "string" ? checkout.subscription : null;

  if (type === "account_tier" && value) {
    await env.DB.prepare(
      `UPDATE users
       SET tier = ?, stripe_subscription_id = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(value, subscriptionId, now, userId)
      .run();
    return;
  }

  if (type === "module_addon" && value) {
    await env.DB.prepare(
      `INSERT INTO entitlements (
        user_id,
        module,
        tier,
        status,
        granted_at,
        stripe_subscription_id
      ) VALUES (?, ?, 'active', 'active', ?, ?)
      ON CONFLICT(user_id, module) DO UPDATE SET
        status = 'active',
        granted_at = excluded.granted_at,
        stripe_subscription_id = excluded.stripe_subscription_id`,
    )
      .bind(userId, value, now, subscriptionId)
      .run();
  }
}

async function grantEntitlementFromSubscription(
  env: Env,
  userId: string,
  subscription: StripeSubscription,
  now: number,
): Promise<void> {
  const type = subscription.metadata?.type;
  const value = subscription.metadata?.value;

  if (!type || !value) {
    return;
  }

  await grantEntitlement(
    env,
    userId,
    {
      metadata: { type, value, userId },
      ...(subscription.id ? { subscription: subscription.id } : {}),
    },
    now,
  );
}

async function revokeEntitlement(
  env: Env,
  subscription: StripeSubscription,
  now: number,
): Promise<void> {
  const userId = subscription.metadata?.userId;
  const type = subscription.metadata?.type;
  const value = subscription.metadata?.value;

  if (!userId) {
    return;
  }

  if (type === "account_tier") {
    await env.DB.prepare(
      "UPDATE users SET tier = 'startup', updated_at = ? WHERE id = ?",
    )
      .bind(now, userId)
      .run();
    return;
  }

  if (type === "module_addon" && value) {
    await env.DB.prepare(
      `UPDATE entitlements
       SET status = 'cancelled'
       WHERE user_id = ? AND module = ?`,
    )
      .bind(userId, value)
      .run();
  }
}

async function requireSession(
  request: Request,
  env: Env,
): Promise<SessionPayload | null> {
  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length);
  if (!token) {
    return null;
  }

  const response = await fetch(env.AUTH_VERIFY_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as SessionPayload & {
    readonly valid: boolean;
  };

  return payload.valid ? payload : null;
}

async function parseCheckoutRequest(
  request: Request,
  requestId: string,
): Promise<CheckoutRequest | Response> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return jsonError("invalid_content_type", 415, requestId);
  }

  try {
    const body = (await request.json()) as Partial<CheckoutRequest>;

    if (
      (body.type !== "account_tier" && body.type !== "module_addon") ||
      typeof body.value !== "string" ||
      body.value.length === 0 ||
      body.value.length > 80
    ) {
      return jsonError("invalid_checkout_request", 400, requestId);
    }

    return body as CheckoutRequest;
  } catch {
    return jsonError("invalid_json", 400, requestId);
  }
}

function getStripeMetadata(
  object: Record<string, unknown>,
  key: string,
): string | null {
  const metadata = object["metadata"];

  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toBillingEventSummary(event: StripeEvent): Record<string, unknown> {
  const object = event.data.object;
  const metadata = object["metadata"];

  return {
    eventId: event.id,
    eventType: event.type,
    objectId: typeof object["id"] === "string" ? object["id"] : null,
    subscriptionStatus:
      typeof object["status"] === "string" ? object["status"] : null,
    metadata:
      metadata && typeof metadata === "object"
        ? {
            type:
              typeof (metadata as Record<string, unknown>)["type"] === "string"
                ? (metadata as Record<string, unknown>)["type"]
                : null,
            value:
              typeof (metadata as Record<string, unknown>)["value"] === "string"
                ? (metadata as Record<string, unknown>)["value"]
                : null,
            userId:
              typeof (metadata as Record<string, unknown>)["userId"] === "string"
                ? (metadata as Record<string, unknown>)["userId"]
                : null,
          }
        : null,
  };
}

function isStripePriceId(value: string | undefined): value is string {
  return Boolean(
    value &&
      value.startsWith("price_") &&
      value.length > "price_".length &&
      !value.endsWith("_ID"),
  );
}

function corsHeaders(env: Env, request: Request): HeadersInit {
  const origin = request.headers.get("Origin");

  if (!origin || origin !== env.ALLOWED_ORIGIN) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

function withCors(response: Response, cors: HeadersInit): Response {
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(cors)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

function jsonError(
  error: string,
  status: number,
  requestId?: string,
): Response {
  return Response.json(
    {
      error,
      ...(requestId ? { requestId } : {}),
    },
    {
      status,
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

function logSafeError(input: {
  readonly requestId: string;
  readonly route: string;
  readonly error?: unknown;
  readonly errorCode?: string;
}): void {
  console.error(
    JSON.stringify({
      level: "error",
      requestId: input.requestId,
      route: input.route,
      code: input.errorCode ?? "unhandled_error",
      errorName: input.error instanceof Error ? input.error.name : undefined,
    }),
  );
}
