import { Hono } from 'hono';
import { fromGatewayHeaders } from '../authz/session.js';

type Env = {
  Bindings: {
    AUTH_BASE_URL: string;
  };
};

const onboarding = new Hono<Env>();

onboarding.get('/api/onboarding', async (c) => {
  const session = fromGatewayHeaders(c.req.raw);

  if (!session) {
    return c.json({ ok: false, error: 'unauthenticated' }, 401);
  }

  return c.json({
    ok: true,
    onboarding: {
      userId: session.userId,
      email: session.email,
      status: 'ready',
    },
  });
});

export const onboardingRoutes = onboarding;
export default onboarding;
