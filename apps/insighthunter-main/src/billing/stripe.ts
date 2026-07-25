export type StripeCheckoutSession = {
  id: string;
  url: string;
};

export type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

type CreateCheckoutSessionInput = {
  secretKey: string;
  priceId: string;
  customerEmail: string;
  customerId: string;
  successUrl: string;
  cancelUrl: string;
  planCode: string;
};

function toFormBody(values: Record<string, string>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    params.set(key, value);
  }

  return params.toString();
}

export async function createStripeCheckoutSession(input: CreateCheckoutSessionInput): Promise<StripeCheckoutSession> {
  const body = toFormBody({
    mode: "subscription",
    "line_items[0][price]": input.priceId,
    "line_items[0][quantity]": "1",
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.customerEmail,
    "metadata[customer_id]": input.customerId,
    "metadata[plan_code]": input.planCode
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: 'Bearer ${input.secretKey}',
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error('Stripe checkout session failed: ${response.status} ${text}');
  }

  const payload = await response.json() as { id: string; url: string };
  return { id: payload.id, url: payload.url };
}

export async function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string,
  webhookSecret: string,
): Promise<boolean> {
  const signatureParts = signatureHeader.split(",");
  const timestampPart = signatureParts.find((part) => part.startsWith("t="));
  const v1Part = signatureParts.find((part) => part.startsWith("v1="));

  if (!timestampPart || !v1Part) {
    return false;
  }

  const timestamp = timestampPart.slice(2);
  const signature = v1Part.slice(3);
  const signedPayload = '${timestamp}.${payload}';

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return result === 0;
}
