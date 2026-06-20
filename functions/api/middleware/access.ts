/**
 * Cloudflare Access Middleware
 * Reads cf-access-authenticated-user-email header, auto-creates user in D1,
 * and attaches user context to every request.
 */

import type { D1Database } from '@cloudflare/workers-types';

export interface User {
  id: number;
  email: string;
  plan: 'free' | 'lite' | 'pro' | 'enterprise';
  subscription_status: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  onboarding_complete: boolean;
  business_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccessEnv {
  DB: D1Database;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_LITE: string;
  STRIPE_PRICE_PRO: string;
  STRIPE_PRICE_ENTERPRISE: string;
  APP_URL: string;
}

export async function withAccessUser(
  request: Request,
  env: AccessEnv
): Promise<{ user: User | null; email: string | null }> {
  const email = request.headers.get('cf-access-authenticated-user-email');

  if (!email) {
    return { user: null, email: null };
  }

  // Find or create user
  let user = await env.DB.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(email).first<User>();

  if (!user) {
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO users (email, plan, subscription_status, onboarding_complete, created_at, updated_at)
       VALUES (?, 'free', 'inactive', 0, ?, ?)`
    ).bind(email, now, now).run();

    user = await env.DB.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email).first<User>();
  }

  return { user: user ?? null, email };
}

export function requireAuth(
  user: User | null,
  email: string | null
): Response | null {
  if (!email) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', code: 'NO_ACCESS_SESSION' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'User not found', code: 'USER_NOT_FOUND' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return null;
}

export function requirePlan(
  user: User,
  minPlan: 'lite' | 'pro' | 'enterprise'
): Response | null {
  const planOrder = { free: 0, lite: 1, pro: 2, enterprise: 3 };
  const userLevel = planOrder[user.plan] ?? 0;
  const requiredLevel = planOrder[minPlan] ?? 1;

  if (userLevel < requiredLevel) {
    return new Response(
      JSON.stringify({
        error: 'Upgrade required',
        code: 'PLAN_REQUIRED',
        required_plan: minPlan,
        current_plan: user.plan,
        upgrade_url: '/pricing',
      }),
      { status: 402, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (user.subscription_status === 'past_due') {
    return new Response(
      JSON.stringify({
        error: 'Payment past due. Please update your billing.',
        code: 'PAYMENT_PAST_DUE',
        billing_url: '/billing',
      }),
      { status: 402, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return null;
}
