// apps/insighthunter-auth/src/pages/api/auth/login.ts
import type { APIRoute } from 'astro';
import {
  checkRateLimit, verifyTurnstile, verifyPassword,
  signAuthJWT, createSession, auditLog
} from '../../../lib/auth';

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const env = locals.runtime.env;

  try {
    const { email, password, turnstileToken } = await request.json() as {
      email: string; password: string; turnstileToken: string;
    };

    if (!email || !password) return err('Email and password are required', 400);

    // 1. Rate limit: 10 attempts per IP per 15 minutes
    const ip   = clientAddress ?? request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const rate = await checkRateLimit(env.RATE_LIMIT, `login:${ip}`, 10, 900);
    if (!rate.allowed) return err('Too many login attempts. Please wait 15 minutes.', 429);

    // 2. Turnstile
    if (env.ENVIRONMENT === 'production') {
      const ok = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY);
      if (!ok) return err('CAPTCHA verification failed.', 400);
    }

    // 3. Lookup user
    const user = await env.DB.prepare(
      `SELECT id, email, password_hash, email_verified, subscription_tier
       FROM users WHERE email = ?`
    ).bind(email.toLowerCase()).first<{
      id: string; email: string; password_hash: string;
      email_verified: number; subscription_tier: string;
    }>();

    // Constant-time response to prevent user enumeration
    if (!user || !user.password_hash) {
      await new Promise(r => setTimeout(r, 200)); // timing equalization
      return err('Invalid email or password.', 401);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      auditLog(env, 'login_failed', user.id, ip, request.headers.get('user-agent') ?? '');
      return err('Invalid email or password.', 401);
    }

    // 4. Create session + JWT
    await createSession(env, user.id, user.email);
    const jwt = await signAuthJWT(user.id, user.email, env.JWT_SECRET);

    // 5. Audit + Analytics
    auditLog(env, 'login', user.id, ip, request.headers.get('user-agent') ?? '');
    env.ANALYTICS.writeDataPoint({
      blobs: ['login', user.email, user.subscription_tier],
      doubles: [1],
      indexes: [user.id],
    });

    return new Response(JSON.stringify({
      success: true,
      jwt,
      userId: user.id,
      emailVerified: user.email_verified === 1,
      subscriptionTier: user.subscription_tier,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `auth_token=${jwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
      },
    });

  } catch (e) {
    console.error('Login error:', e);
    return err('An unexpected error occurred.', 500);
  }
};

const err = (message: string, status: number) =>
  new Response(JSON.stringify({ error: message }), {
    status, headers: { 'Content-Type': 'application/json' },
  });
