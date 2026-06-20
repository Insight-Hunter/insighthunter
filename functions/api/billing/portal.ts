/**
 * POST /api/billing/portal
 * Creates a Stripe Customer Portal session so users can manage billing.
 */

import { withAccessUser, requireAuth } from '../middleware/access';
import type { AccessEnv } from '../middleware/access';

export const onRequestPost: PagesFunction<AccessEnv> = async ({ request, env }) => {
  const { user, email } = await withAccessUser(request, env);
  const authError = requireAuth(user, email);
  if (authError) return authError;

  if (!user!.stripe_customer_id) {
    return new Response(
      JSON.stringify({ error: 'No billing account found. Please subscribe first.', redirect: '/pricing' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      customer: user!.stripe_customer_id,
      return_url: `${env.APP_URL}/dashboard`,
    }),
  });

  const session = await res.json() as { url?: string };

  if (!session.url) {
    return new Response(
      JSON.stringify({ error: 'Could not create billing portal session' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ url: session.url }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
