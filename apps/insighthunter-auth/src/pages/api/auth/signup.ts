// apps/insighthunter-auth/src/pages/api/auth/signup.ts
import type { APIRoute } from 'astro';
import {
  checkRateLimit, verifyTurnstile, hashPassword,
  signAuthJWT, createSession, sendEmail,
  verificationEmailHtml, auditLog
} from '../../../lib/auth';

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const env = locals.runtime.env;

  try {
    const { email, password, fullName, turnstileToken } = await request.json() as {
      email: string; password: string; fullName: string; turnstileToken: string;
    };

    // 1. Input validation
    if (!email || !password || !fullName) return err('All fields are required', 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('Invalid email address', 400);
    if (password.length < 8) return err('Password must be at least 8 characters', 400);
    if (fullName.trim().length < 2) return err('Please enter your full name', 400);

    // 2. Rate limit: 5 signups per IP per hour
    const ip   = clientAddress ?? request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const rate = await checkRateLimit(env.RATE_LIMIT, `signup:${ip}`, 5, 3600);
    if (!rate.allowed) return err('Too many signup attempts. Please try again in an hour.', 429);

    // 3. Turnstile CAPTCHA
    if (env.ENVIRONMENT === 'production') {
      const captchaOk = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY);
      if (!captchaOk) return err('CAPTCHA verification failed. Please try again.', 400);
    }

    // 4. Check for existing user
    const existing = await env.DB.prepare(
      `SELECT id FROM users WHERE email = ?`
    ).bind(email.toLowerCase()).first();
    if (existing) return err('An account with this email already exists.', 409);

    // 5. Hash password + insert user
    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, email_verified)
       VALUES (?, ?, ?, ?, 0)`
    ).bind(userId, email.toLowerCase(), passwordHash, fullName.trim()).run();

    // 6. Create session immediately (user can use app, email verify prompts later)
    const sessionToken = await createSession(env, userId, email.toLowerCase());
    const jwt          = await signAuthJWT(userId, email.toLowerCase(), env.JWT_SECRET);

    // 7. Send verification email (non-blocking)
    try {
      const verifyToken = await import('../../../lib/auth').then(m =>
        m.signEmailJWT(email.toLowerCase(), env.VERIFY_EMAIL_JWT_SECRET, '24h')
      );
      const verifyUrl = `https://${env.APP_DOMAIN}/auth/verify-email?token=${verifyToken}`;
      sendEmail(
        env.RESEND_API_KEY,
        email,
        `Verify your ${env.APP_NAME} email`,
        verificationEmailHtml(env.APP_NAME, verifyUrl)
      ).catch(console.error); // non-blocking
    } catch { /* email failure doesn't block signup */ }

    // 8. Audit log + Analytics
    auditLog(env, 'signup', userId, ip, request.headers.get('user-agent') ?? '');
    env.ANALYTICS.writeDataPoint({
      blobs: ['signup', email.toLowerCase()],
      doubles: [1],
      indexes: [userId],
    });

    return new Response(JSON.stringify({ success: true, sessionToken, jwt, userId }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `auth_token=${jwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
      },
    });

  } catch (e) {
    console.error('Signup error:', e);
    return err('An unexpected error occurred. Please try again.', 500);
  }
};

const err = (message: string, status: number) =>
  new Response(JSON.stringify({ error: message }), {
    status, headers: { 'Content-Type': 'application/json' },
  });
