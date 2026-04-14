import type { AuthUser } from '@ih/types';

interface Env {
  IH_ORG_ID: string;   // injected as binding var at upload time
  IH_TIER: string;     // injected as binding var at upload time
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Parse the AuthUser injected by the dispatch worker
    const userHeader = request.headers.get('X-IH-User');
    if (!userHeader) {
      return Response.json({ error: 'Missing user context' }, { status: 401 });
    }

    let user: AuthUser;
    try {
      user = JSON.parse(userHeader) as AuthUser;
    } catch {
      return Response.json({ error: 'Invalid user context' }, { status: 400 });
    }

    // Verify the org in the token matches this worker's org
    if (user.orgId !== env.IH_ORG_ID) {
      return Response.json({ error: 'Org mismatch — access denied' }, { status: 403 });
    }

    const url = new URL(request.url);

    // Audit log for enterprise tenant
    console.log(JSON.stringify({
      event: 'enterprise_request',
      orgId: env.IH_ORG_ID,
      userId: user.userId,
      method: request.method,
      path: url.pathname,
      timestamp: new Date().toISOString(),
    }));

    // Enterprise tenants replace this handler body with their custom logic.
    // This base implementation returns a confirmation response.
    return Response.json({
      message: 'InsightHunter Enterprise Worker Active',
      orgId: env.IH_ORG_ID,
      tier: env.IH_TIER,
      path: url.pathname,
      method: request.method,
      user: { userId: user.userId, email: user.email, role: user.role },
    });
  },
};
