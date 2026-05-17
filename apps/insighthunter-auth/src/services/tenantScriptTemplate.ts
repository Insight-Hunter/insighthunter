// src/backend/services/tenantScriptTemplate.ts

export function buildDefaultTenantScript(opts: {
  orgId: string;
  tier: string;
  platformApiUrl: string; // e.g. "https://bookkeeping.insighthunter.app"
}): string {
  const { orgId, tier, platformApiUrl } = opts;

  return /* javascript */ `
/**
 * InsightHunter Tenant Worker
 * org: ${orgId}  |  tier: ${tier}
 * Auto-generated at signup — do not edit manually.
 *
 * This Worker is a thin proxy that:
 *  1. Validates the request comes from a known source
 *  2. Injects org context headers
 *  3. Forwards to the InsightHunter platform API
 *
 * Bindings available:
 *  - env.TENANT_KV   — per-tenant KV store (config, cache)
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Health check — useful for monitoring
    if (url.pathname === "/_health") {
      return Response.json({
        status: "ok",
        org: "${orgId}",
        tier: "${tier}",
        ts: Date.now(),
      });
    }

    // Rate limit check via KV (simple sliding window)
    const rateLimitKey = \`rl:\${new Date().toISOString().slice(0, 16)}\`; // per-minute key
    const current = parseInt((await env.TENANT_KV.get(rateLimitKey)) ?? "0");
    const limit = ${tier === "lite" ? 100 : tier === "standard" ? 500 : 2000};

    if (current >= limit) {
      return Response.json(
        { error: "Rate limit exceeded", tier: "${tier}", limit },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    ctx.waitUntil(
      env.TENANT_KV.put(rateLimitKey, String(current + 1), { expirationTtl: 120 })
    );

    // Forward to platform API with org context injected
    const upstream = new Request("${platformApiUrl}" + url.pathname + url.search, {
      method: request.method,
      headers: (() => {
        const h = new Headers(request.headers);
        h.set("X-IH-Org-ID", "${orgId}");
        h.set("X-IH-Tier", "${tier}");
        return h;
      })(),
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "follow",
    });

    return fetch(upstream);
  },
};
`;
}
