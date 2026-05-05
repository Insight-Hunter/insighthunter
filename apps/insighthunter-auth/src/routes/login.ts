import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AuthService } from '../services/authService';
import { TokenService } from '../services/tokenService';
import type { Env } from '../types/env';

const login = new Hono<{ Bindings: Env }>();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

login.post('/', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  // Rate limiting
  const rateLimitKey = `ratelimit:login:${email}`;
  const attempts = parseInt((await c.env.IH_AUTH_KV.get(rateLimitKey)) || '0');
  if (attempts >= 10) {
    return c.json({ error: 'Too many attempts', code: 'RATE_LIMITED' }, 429);
  }

  const authService = new AuthService(c.env);
  const user = await authService.validateCredentials(email, password);

  if (!user) {
    await c.env.IH_AUTH_KV.put(rateLimitKey, String(attempts + 1), { expirationTtl: 900 });
    return c.json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }, 401);
  }

  await c.env.IH_AUTH_KV.delete(rateLimitKey);

  const tokenService = new TokenService(c.env);
  const { accessToken, refreshToken } = await tokenService.createTokenPair(user);

  c.header('Set-Cookie', [
    `ih_session=${accessToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600; Domain=.insighthunter.app`,
    `ih_refresh=${refreshToken}; HttpOnly; Secure; SameSite=Lax; Path=/refresh; Max-Age=2592000; Domain=.insighthunter.app`,
  ].join(', '));

  return c.json({
    success: true,
    user: { userId: user.id, email: user.email, orgId: user.org_id, tier: user.tier },
    accessToken,
  });
});

export default login;
