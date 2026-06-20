/**
 * POST /api/onboard
 * Collects business name + plan choice after first Access login.
 * Called by /onboarding Astro page.
 */

import { withAccessUser, requireAuth } from './middleware/access';
import type { AccessEnv } from './middleware/access';

interface OnboardPayload {
  business_name: string;
  plan: 'free' | 'lite' | 'pro' | 'enterprise';
  industry?: string;
  team_size?: string;
}

export const onRequestPost: PagesFunction<AccessEnv> = async ({ request, env }) => {
  const { user, email } = await withAccessUser(request, env);
  const authError = requireAuth(user, email);
  if (authError) return authError;

  let body: OnboardPayload;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { business_name, plan, industry, team_size } = body;

  if (!business_name?.trim()) {
    return new Response(
      JSON.stringify({ error: 'business_name is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE users
     SET business_name = ?, plan = ?, industry = ?, team_size = ?,
         onboarding_complete = 1, updated_at = ?
     WHERE email = ?`
  ).bind(
    business_name.trim(),
    plan ?? 'free',
    industry ?? null,
    team_size ?? null,
    now,
    user!.email
  ).run();

  // If paid plan selected, redirect to Stripe Checkout
  if (plan && plan !== 'free') {
    const priceMap: Record<string, string> = {
      lite: env.STRIPE_PRICE_LITE,
      pro: env.STRIPE_PRICE_PRO,
      enterprise: env.STRIPE_PRICE_ENTERPRISE,
    };
    const priceId = priceMap[plan];

    if (priceId) {
      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'payment_method_types[]': 'card',
          mode: 'subscription',
          'line_items[0][price]': priceId,
          'line_items[0][quantity]': '1',
          customer_email: user!.email,
          success_url: `${env.APP_URL}/dashboard?subscribed=true`,
          cancel_url: `${env.APP_URL}/pricing`,
          'metadata[user_email]': user!.email,
          'metadata[plan]': plan,
        }),
      });

      const session = await stripeRes.json() as { url?: string; error?: { message: string } };

      if (session.url) {
        return new Response(
          JSON.stringify({ redirect: session.url }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  }

  return new Response(
    JSON.stringify({ redirect: '/dashboard' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
