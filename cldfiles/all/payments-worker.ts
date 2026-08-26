import { ACCOUNT_TIERS, MODULE_ADDONS } from "./catalog";
import {
  createBillingPortalSession,
  createSubscriptionCheckoutSession,
  getOrCreateCustomer,
  verifyStripeSignature,
} from "./stripe";
import type { CheckoutRequest, Env, SessionPayload } from "./types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(env, request);

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    try {
      if (url.pathname === "/catalog" && request.method === "GET") {
        return withCors(
          Response.json({ accountTiers: ACCOUNT_TIERS, moduleAddons: MODULE_ADDONS }),
          cors
        );
      }

      if (url.pathname === "/checkout" && request.method === "POST") {
        return withCors(await handleCheckout(request, env), cors);
      }

      if (url.pathname === "/portal" && request.method === "POST") {
        return withCors(await handlePortal(request, env), cors);
      }

      if (url.pathname === "/webhook" && request.method === "POST") {
        // No CORS on webhook — Stripe calls this server-to-server.
        return handleWebhook(request, env);
      }

      return withCors(new Response("Not found", { status: 404 }), cors);
    } catch (err) {
      console.error("payments worker error:", err);
      return withCors(Response.json({ error: "internal_error" }, { status: 500 }), cors);
    }
  },
} satisfies ExportedHandler<Env>;

async function handleCheckout(request: Request, env: Env): Promise<Response> {
  const session = await requireSession(request, env);
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as CheckoutRequest;
  const catalog = body.type === "account_tier" ? ACCOUNT_TIERS : MODULE_ADDONS;
  const entry = (catalog as Record<string, (typeof ACCOUNT_TIERS)["pro"]>)[body.value];

  if (!entry) return Response.json({ error: "unknown_catalog_item" }, { status: 400 });
  if (entry.monthlyUsd === 0) {
    return Response.json({ error: "free_tier_no_checkout_needed" }, { status: 400 });
  }

  const priceId = (env as unknown as Record<string, string>)[entry.priceEnvKey];
  if (!priceId) {
    console.error(`Missing Stripe price id for env key ${entry.priceEnvKey}`);
    return Response.json({ error: "pricing_not_configured" }, { status: 500 });
  }

  const user = await env.DB.prepare(
    "SELECT stripe_customer_id FROM users WHERE id = ?"
  )
    .bind(session.userId)
    .first<{ stripe_customer_id: string | null }>();

  const customerId = await getOrCreateCustomer(
    env,
    session.userId,
    session.email,
    user?.stripe_customer_id ?? null
  );

  if (!user?.stripe_customer_id) {
    await env.DB.prepare("UPDATE users SET stripe_customer_id = ? WHERE id = ?")
      .bind(customerId, session.userId)
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

  return Response.json({ checkoutUrl: checkoutSession.url });
}

async function handlePortal(request: Request, env: Env): Promise<Response> {
  const session = await requireSession(request, env);
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const user = await env.DB.prepare(
    "SELECT stripe_customer_id FROM users WHERE id = ?"
  )
    .bind(session.userId)
    .first<{ stripe_customer_id: string | null }>();

  if (!user?.stripe_customer_id) {
    return Response.json({ error: "no_billing_account" }, { status: 400 });
  }

  const portalSession = await createBillingPortalSession(
    env,
    user.stripe_customer_id,
    `${env.APP_BASE_URL}/dashboard/billing`
  );

  return Response.json({ portalUrl: portalSession.url });
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const signature = request.headers.get("Stripe-Signature");
  const payload = await request.text();

  if (!signature || !(await verifyStripeSignature(payload, signature, env.STRIPE_WEBHOOK_SECRET))) {
    return new Response("invalid signature", { status: 400 });
  }

  const event = JSON.parse(payload);

  // Idempotency: Stripe may redeliver events.
  const already = await env.DB.prepare(
    "SELECT id FROM billing_events WHERE stripe_event_id = ?"
  )
    .bind(event.id)
    .first();
  if (already) return new Response("ok (duplicate)", { status: 200 });

  const now = Date.now();
  let userId: string | null = null;

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      userId = session.metadata?.userId ?? null;
      if (userId) await grantEntitlement(env, userId, session);
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object;
      userId = sub.metadata?.userId ?? null;
      if (userId && sub.status !== "active") {
        await revokeEntitlement(env, sub);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      userId = sub.metadata?.userId ?? null;
      if (userId) await revokeEntitlement(env, sub);
      break;
    }
    default:
      break; // ignore other event types
  }

  await env.DB.prepare(
    `INSERT INTO billing_events (stripe_event_id, event_type, user_id, raw_payload, received_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(event.id, event.type, userId, payload, now)
    .run();

  return new Response("ok", { status: 200 });
}

async function grantEntitlement(env: Env, userId: string, session: any): Promise<void> {
  const type = session.metadata?.type;
  const value = session.metadata?.value;
  const subscriptionId = session.subscription as string | undefined;
  const now = Date.now();

  if (type === "account_tier") {
    await env.DB.prepare(
      "UPDATE users SET tier = ?, stripe_subscription_id = ?, updated_at = ? WHERE id = ?"
    )
      .bind(value, subscriptionId ?? null, now, userId)
      .run();
  } else if (type === "module_addon") {
    await env.DB.prepare(
      `INSERT INTO entitlements (user_id, module, tier, status, granted_at, stripe_subscription_id)
       VALUES (?, ?, 'active', 'active', ?, ?)
       ON CONFLICT(user_id, module) DO UPDATE SET
         status = 'active', granted_at = excluded.granted_at,
         stripe_subscription_id = excluded.stripe_subscription_id`
    )
      .bind(userId, value, now, subscriptionId ?? null)
      .run();
  }
}

async function revokeEntitlement(env: Env, subscription: any): Promise<void> {
  const userId = subscription.metadata?.userId;
  const type = subscription.metadata?.type;
  const value = subscription.metadata?.value;
  const now = Date.now();
  if (!userId) return;

  if (type === "account_tier") {
    // Downgrade to free tier — do not delete the account.
    await env.DB.prepare(
      "UPDATE users SET tier = 'startup', updated_at = ? WHERE id = ?"
    )
      .bind(now, userId)
      .run();
  } else if (type === "module_addon" && value) {
    await env.DB.prepare(
      "UPDATE entitlements SET status = 'cancelled' WHERE user_id = ? AND module = ?"
    )
      .bind(userId, value)
      .run();
  }
}

async function requireSession(request: Request, env: Env): Promise<SessionPayload | null> {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length);

  const res = await fetch(env.AUTH_VERIFY_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as SessionPayload & { valid: boolean };
  return data.valid ? data : null;
}

function corsHeaders(env: Env, request: Request): HeadersInit {
  const origin = request.headers.get("Origin");
  const allowed = origin === env.ALLOWED_ORIGIN ? origin : env.ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

function withCors(response: Response, cors: HeadersInit): Response {
  const merged = new Headers(response.headers);
  for (const [k, v] of Object.entries(cors as Record<string, string>)) merged.set(k, v);
  return new Response(response.body, { status: response.status, headers: merged });
}
