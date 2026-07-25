// apps/insighthunter-main/src/routes/onboarding.ts
import { Hono } from 'hono';
import { getSession } from '../authz/session.js';

type Env = {
  Bindings: {
    AUTH_BASE_URL: string;
  };
};

const onboarding = new Hono<Env>();

onboarding.get('/api/onboarding', async (c) => {
  const session = await getSession(c.env.AUTH_BASE_URL, c.req.raw);

  if (!session) {
    return c.json(
      {
        ok: false,
        error: 'unauthenticated',
      },
      401,
    );
  }

  return c.json({
    ok: true,
    onboarding: {
      userId: session.user.subject,
      email: session.user.email ?? null,
      status: 'ready',
    },
  });
});

export default onboarding;
