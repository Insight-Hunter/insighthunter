import type { APIRoute } from "astro";
import type { Env } from "@/types";

const SCOPES = [
  "com.intuit.quickbooks.accounting",
].join(" ");

export const GET: APIRoute = async ({ locals, redirect }) => {
  const env = (locals as any).runtime?.env as Env;

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id:     env.QBO_CLIENT_ID,
    response_type: "code",
    scope:         SCOPES,
    redirect_uri:  env.QBO_REDIRECT_URI,
    state,
  });

  const authUrl = `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
  return redirect(authUrl, 302);
};
