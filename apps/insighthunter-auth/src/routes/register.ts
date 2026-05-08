import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AuthService } from '../services/authService';
import { OrgService } from '../services/orgService';
import { TokenService } from '../services/tokenService';
import type { Env } from '../types/env';

const register = new Hono<{ Bindings: Env }>();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  businessName: z.string().min(1).max(200),
  tier: z.enum(['lite', 'standard', 'pro']).default('lite'),
});

register.post('/', zValidator('json', registerSchema), async (c) => {
  const body = c.req.valid('json');

  const authService = new AuthService(c.env);
  const existing = await authService.findUserByEmail(body.email);
  if (existing) {
    return c.json({ error: 'Email already registered', code: 'EMAIL_EXISTS' }, 409);
  }

  const orgService = new OrgService(c.env);
  const { user, org } = await orgService.createOrgWithUser({
    email: body.email,
    password: body.password,
    businessName: body.businessName,
    tier: body.tier,
  });

  const tokenService = new TokenService(c.env);
  const { accessToken, refreshToken } = await tokenService.createTokenPair(user);

  c.header('Set-Cookie', [
    `ih_session=${accessToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600; Domain=.insighthunter.app`,
    `ih_refresh=${refreshToken}; HttpOnly; Secure; SameSite=Lax; Path=/refresh; Max-Age=2592000; Domain=.insighthunter.app`,
  ].join(', '));

  // Enqueue welcome email
  await c.env.IH_WELCOME_QUEUE.send({ userId: user.id, email: user.email, orgId: org.id, businessName: body.businessName });

  return c.json({
    success: true,
    user: { userId: user.id, email: user.email, orgId: org.id, tier: body.tier },
    accessToken,
  }, 201);
});

export default register;
