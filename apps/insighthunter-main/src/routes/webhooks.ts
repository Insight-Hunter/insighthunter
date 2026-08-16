import { Hono } from "hono";
import { verifyStripeWebhookSignature } from "./../billing/stripe.js";

type EnvLike = {
  STRIPE_WEBHOOK_SECRET?: string;
};

function getEventType(value: unknown): string | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  if (!("type" in value)) {
    return null;
  }

  const eventType = (value as { type?: unknown }).type;
  return typeof eventType === "string" ? eventType : null;
}
export const webhooks = new Hono();

export async function handleStripeWebhook(request: Request, env: EnvLike): Promise<Response> {
  const signature =
    request.headers.get("stripe-signature") ?? request.headers.get("Stripe-Signature") ?? "";

  if (!env.STRIPE_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ ok: false, error: "Missing STRIPE_WEBHOOK_SECRET" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const body = await request.text();

  try {
    const event = await verifyStripeWebhookSignature(body, signature, env.STRIPE_WEBHOOK_SECRET);

    return new Response(
      JSON.stringify({
        ok: true,
        received: true,
        type: getEventType(event),
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook verification failed";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
}

export default webhooks;
export const webhooksRoutes = webhooks;
