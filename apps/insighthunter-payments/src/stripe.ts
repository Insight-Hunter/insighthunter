import type { Env } from "./types";

const STRIPE_API = "https://api.stripe.com/v1";

/** Stripe's API accepts application/x-www-form-urlencoded with bracket
 * notation for nested objects/arrays — this encodes a plain JS object into
 * that format, e.g. { metadata: { userId: "x" } } -> "metadata[userId]=x" */
function formEncode(obj: Record<string, unknown>, prefix = ""): string[] {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const paramKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === "object" && item !== null) {
          parts.push(...formEncode(item as Record<string, unknown>, `${paramKey}[${i}]`));
        } else {
          parts.push(`${encodeURIComponent(`${paramKey}[${i}]`)}=${encodeURIComponent(String(item))}`);
        }
      });
    } else if (typeof value === "object") {
      parts.push(...formEncode(value as Record<string, unknown>, paramKey));
    } else {
      parts.push(`${encodeURIComponent(paramKey)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts;
}

async function stripeRequest(
  env: Env,
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>
): Promise<any> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-06-20",
    },
    body: body ? formEncode(body).join("&") : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Stripe API error (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

export async function getOrCreateCustomer(
  env: Env,
  userId: string,
  email: string,
  existingCustomerId: string | null
): Promise<string> {
  if (existingCustomerId) return existingCustomerId;
  const customer = await stripeRequest(env, "POST", "/customers", {
    email,
    metadata: { userId },
  });
  return customer.id;
}

export async function createSubscriptionCheckoutSession(
  env: Env,
  params: {
    customerId: string;
    priceId: string;
    userId: string;
    type: string;
    value: string;
    successUrl: string;
    cancelUrl: string;
  }
): Promise<{ id: string; url: string }> {
  return stripeRequest(env, "POST", "/checkout/sessions", {
    mode: "subscription",
    customer: params.customerId,
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: { userId: params.userId, type: params.type, value: params.value },
    // Copy metadata onto the subscription itself so later webhook events
    // (renewal, cancellation) can identify the user without extra lookups.
    subscription_data: {
      metadata: { userId: params.userId, type: params.type, value: params.value },
    },
  });
}

export async function createBillingPortalSession(
  env: Env,
  customerId: string,
  returnUrl: string
): Promise<{ url: string }> {
  return stripeRequest(env, "POST", "/billing_portal/sessions", {
    customer: customerId,
    return_url: returnUrl,
  });
}

/** Verify Stripe-Signature header per Stripe's documented scheme:
 * header = "t=<timestamp>,v1=<hmac>" where hmac = HMAC-SHA256(secret, `${t}.${payload}`) */
export async function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300
): Promise<boolean> {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=") as [string, string])
  );
  const timestamp = parts["t"];
  const v1 = parts["v1"];
  if (!timestamp || !v1) return false;

  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
  if (age > toleranceSeconds) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`)
  );
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (computed.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}
