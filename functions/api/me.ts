/**
 * GET /api/me
 * Returns current authenticated user's identity + plan + onboarding status.
 * Frontend uses this instead of any login state.
 */

import { withAccessUser, requireAuth } from './middleware/access';
import type { AccessEnv } from './middleware/access';

export const onRequestGet: PagesFunction<AccessEnv> = async ({ request, env }) => {
  const { user, email } = await withAccessUser(request, env);
  const authError = requireAuth(user, email);
  if (authError) return authError;

  return new Response(
    JSON.stringify({
      email: user!.email,
      plan: user!.plan,
      subscription_status: user!.subscription_status,
      onboarding_complete: Boolean(user!.onboarding_complete),
      business_name: user!.business_name,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  );
};
