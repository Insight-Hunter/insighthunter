import { MODULES } from "./modules";
import { renderDashboard, renderMessage } from "./render";
import type { EntitlementsResponse, Env } from "./types";

const COOKIE_NAME = "ih_session";
const COOKIE_MAX_AGE_S = 60 * 60 * 12; // 12h, matches auth's session TTL

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/dashboard" && request.method === "GET") {
        return handleDashboard(request, env, url);
      }

      if (url.pathname === "/dashboard/billing" && request.method === "GET") {
        return handleBillingPortal(request, env);
      }

      if (url.pathname === "/pricing-redirect" && request.method === "GET") {
        // Locked-module tile click — send to marketing pricing page with context.
        const mod = url.searchParams.get("module") ?? "";
        return Response.redirect(`${env.MARKETING_URL}/pricing?upgrade_for=${mod}`, 302);
      }

      if (url.pathname === "/billing/success" && request.method === "GET") {
        return new Response(
          renderMessage({
            title: "Payment successful",
            heading: "You're all set.",
            message:
              "Your plan is updating now — this usually takes a few seconds. If your dashboard doesn't reflect it yet, refresh in a moment.",
            ctaLabel: "Go to dashboard",
            ctaHref: "/dashboard",
          }),
          { headers: { "Content-Type": "text/html;charset=UTF-8" } }
        );
      }

      if (url.pathname === "/billing/cancelled" && request.method === "GET") {
        return new Response(
          renderMessage({
            title: "Checkout cancelled",
            heading: "No changes made.",
            message: "You can pick a plan whenever you're ready.",
            ctaLabel: "Back to dashboard",
            ctaHref: "/dashboard",
          }),
          { headers: { "Content-Type": "text/html;charset=UTF-8" } }
        );
      }

      if (url.pathname === "/logout" && request.method === "POST") {
        return handleLogout(request, env);
      }

      if (url.pathname === "/" ) {
        return Response.redirect(`${url.origin}/dashboard`, 302);
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      console.error("dashboard worker error:", err);
      return new Response(
        renderMessage({
          title: "Something went wrong",
          heading: "We hit a snag loading your dashboard.",
          message: "Try refreshing. If this keeps happening, contact support.",
          ctaLabel: "Retry",
          ctaHref: "/dashboard",
        }),
        { status: 500, headers: { "Content-Type": "text/html;charset=UTF-8" } }
      );
    }
  },
} satisfies ExportedHandler<Env>;

async function handleDashboard(request: Request, env: Env, url: URL): Promise<Response> {
  // Step 1: one-time token handoff from insighthunter-main (?token=...). Exchange
  // it for an HttpOnly cookie and redirect to a clean URL — the token never
  // stays in the address bar or browser history beyond this single hop.
  const incomingToken = url.searchParams.get("token");
  if (incomingToken) {
    const headers = new Headers({ Location: "/dashboard" });
    headers.append("Set-Cookie", buildCookie(incomingToken, env));
    return new Response(null, { status: 302, headers });
  }

  const token = readCookie(request, COOKIE_NAME);
  if (!token) return redirectToLogin(env);

  const entitlements = await fetchEntitlements(env, token);
  if (!entitlements) return redirectToLogin(env);

  const html = renderDashboard({
    email: entitlements.email,
    accountTier: entitlements.accountTier,
    modules: MODULES,
    addons: entitlements.addons,
  });

  return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
}

async function handleBillingPortal(request: Request, env: Env): Promise<Response> {
  const token = readCookie(request, COOKIE_NAME);
  if (!token) return redirectToLogin(env);

  const res = await fetch(`${env.PAYMENTS_API_URL}/portal`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    return new Response(
      renderMessage({
        title: "Billing",
        heading: "No billing account yet.",
        message: "You're on the free Startup plan — nothing to manage yet. Upgrade from pricing to unlock billing.",
        ctaLabel: "See pricing",
        ctaHref: `${env.MARKETING_URL}/pricing`,
      }),
      { headers: { "Content-Type": "text/html;charset=UTF-8" } }
    );
  }

  const data = (await res.json()) as { portalUrl: string };
  return Response.redirect(data.portalUrl, 302);
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  const token = readCookie(request, COOKIE_NAME);
  if (token) {
    await fetch(`${env.AUTH_API_URL}/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {}); // best-effort; still clear the local cookie either way
  }

  const headers = new Headers({ Location: env.MARKETING_URL });
  headers.append("Set-Cookie", `${COOKIE_NAME}=; Domain=${env.COOKIE_DOMAIN}; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict`);
  return new Response(null, { status: 302, headers });
}

async function fetchEntitlements(env: Env, token: string): Promise<EntitlementsResponse | null> {
  const res = await fetch(`${env.AUTH_API_URL}/entitlements`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as EntitlementsResponse;
}

function buildCookie(token: string, env: Env): string {
  return `${COOKIE_NAME}=${token}; Domain=${env.COOKIE_DOMAIN}; Path=/; Max-Age=${COOKIE_MAX_AGE_S}; Secure; HttpOnly; SameSite=Strict`;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  const match = header.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

function redirectToLogin(env: Env): Response {
  return Response.redirect(`${env.MARKETING_URL}/login`, 302);
}
