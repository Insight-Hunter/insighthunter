import { Env } from "./types";
import { getIdentity, validateAccessJWT } from "./access";
import { loginPageHTML } from "./login-page";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", service: "insighthunter-auth" });
    }

    // Post-Access callback: mint session cookie → redirect to platform
    if (url.pathname === "/callback") {
      const token = request.headers.get("Cf-Access-Jwt-Assertion");
      if (!token) {
        return new Response("Missing Access JWT", { status: 401 });
      }

      const cfPayload = await validateAccessJWT(token, env.TEAM_DOMAIN, env.POLICY_AUD);
      if (!cfPayload) {
        return new Response("Access JWT invalid or expired", { status: 403 });
      }

      const identity = await getIdentity(request, env.TEAM_DOMAIN);
      if (!identity) {
        return new Response("Unauthorized — could not resolve identity", { status: 403 });
      }

      const redirectTo =
        url.searchParams.get("redirect") ||
        "https://insighthunter-platform-worker.dmco.workers.dev/dashboard";

      return new Response(null, {
        status: 302,
        headers: {
          Location: redirectTo,
          "Set-Cookie": [
            `ih_user=${encodeURIComponent(identity.email)}`,
            "Path=/",
            "Secure",
            "HttpOnly",
            "SameSite=Lax",
            "Max-Age=86400",
          ].join("; "),
        },
      });
    }

    // All other paths → serve branded login page
    // Cloudflare Access intercepts this and injects its own sign-in UI
    const redirect = url.searchParams.get("redirect") ?? "";
    return new Response(loginPageHTML(redirect), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
};
