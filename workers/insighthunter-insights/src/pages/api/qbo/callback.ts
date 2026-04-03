import type { APIRoute } from "astro";
import type { Env, QBOConnection, QBOTokenResponse } from "@/types";
import { getSessionToken, getSession } from "@/lib/auth/session";

export const GET: APIRoute = async ({ request, url, locals, redirect }) => {
  const env  = (locals as any).runtime?.env as Env;
  const code  = url.searchParams.get("code");
  const realm = url.searchParams.get("realmId");

  if (!code || !realm) return redirect("/dashboard/connect?error=1", 302);

  const token = getSessionToken(request);
  if (!token) return redirect("/auth/login", 302);
  const session = await getSession(env.IH_SESSIONS, token);
  if (!session) return redirect("/auth/login", 302);

  try {
    const creds = btoa(`${env.QBO_CLIENT_ID}:${env.QBO_CLIENT_SECRET}`);
    const res   = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
      method: "POST",
      headers: {
        Authorization:  `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type:   "authorization_code",
        code,
        redirect_uri: env.QBO_REDIRECT_URI,
      }),
    });
    if (!res.ok) throw new Error("Token exchange failed");

    const tokens = await res.json() as QBOTokenResponse;

    // Fetch company name
    const infoRes = await fetch(
      `https://${env.QBO_ENVIRONMENT === "production" ? "quickbooks" : "sandbox-quickbooks"}.api.intuit.com/v3/company/${realm}/companyinfo/${realm}?minorversion=73`,
      { headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: "application/json" } }
    );
    const infoData = infoRes.ok ? await infoRes.json() as any : {};
    const companyName: string = infoData?.CompanyInfo?.CompanyName ?? "My Company";

    const conn: QBOConnection = {
      realmId:      realm,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt:    Date.now() + tokens.expires_in * 1000,
      companyName,
    };

    await env.IH_CACHE.put(`qbo:${session.userId}`, JSON.stringify(conn), {
      expirationTtl: tokens.x_refresh_token_expires_in,
    });

    return redirect("/dashboard/connect?success=1", 302);
  } catch {
    return redirect("/dashboard/connect?error=1", 302);
  }
};
