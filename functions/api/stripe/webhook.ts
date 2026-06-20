/**
 * POST /api/stripe/webhook
 * Handles Stripe events to activate/deactivate subscriptions.
 * MUST be excluded from Cloudflare Access (bypass policy in Access app settings).
 */

import type { AccessEnv } from '../middleware/access';

type StripeEvent = {
  type: string;
  data: {
    object: {
      customer_email?: string;
      customer?: string;
      subscription?: string;
      metadata?: { user_email?: string; plan?: string };
      id?: string;
      status?: string;
    };
  };
};

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = sigHeader.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const signature = parts.find(p => p.startsWith('v1='))?.split('=')[1];

  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return expected === signature;
}

export const onRequestPost: PagesFunction<AccessEnv> = async ({ request, env }) => {
  const sig = request.headers.get('stripe-signature');
  const body = await request.text();

  if (!sig || !await verifyStripeSignature(body, sig, env.STRIPE_WEBHOOK_SECRET)) {
    return new Response('Invalid signature', { status: 400 });
  }

  const event: StripeEvent = JSON.parse(body);
  const obj = event.data.object;
  const now = new Date().toISOString();

  switch (event.type) {
    case 'checkout.session.completed': {
      const email = obj.metadata?.user_email ?? obj.customer_email;
      const plan = obj.metadata?.plan ?? 'lite';
      if (email) {
        await env.DB.prepare(
          `UPDATE users
           SET plan = ?, subscription_status = 'active',
               stripe_customer_id = ?, stripe_subscription_id = ?,
               updated_at = ?
           WHERE email = ?`
        ).bind(plan, obj.customer ?? null, obj.subscription ?? null, now, email).run();
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subId = obj.id;
      const status = obj.status;
      if (subId) {
        await env.DB.prepare(
          `UPDATE users SET subscription_status = ?, updated_at = ?
           WHERE stripe_subscription_id = ?`
        ).bind(status, now, subId).run();
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subId = obj.id;
      if (subId) {
        await env.DB.prepare(
          `UPDATE users
           SET plan = 'free', subscription_status = 'canceled',
               stripe_subscription_id = NULL, updated_at = ?
           WHERE stripe_subscription_id = ?`
        ).bind(now, subId).run();
      }
      break;
    }

    case 'invoice.payment_failed': {
      const customerId = obj.customer;
      if (customerId) {
        await env.DB.prepare(
          `UPDATE users SET subscription_status = 'past_due', updated_at = ?
           WHERE stripe_customer_id = ?`
        ).bind(now, customerId).run();
      }
      break;
    }
  }

  return new Response('ok', { status: 200 });
};
