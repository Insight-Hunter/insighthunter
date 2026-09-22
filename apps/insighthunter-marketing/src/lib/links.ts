import type { Env, PlanId } from "../env.js";

/**
 * Every gateway link is built here so the marketing site never hardcodes an
 * origin (the auth/app origins differ per environment) and never has more
 * than one code path that can construct these URLs.
 */

export function signupUrl(env: Pick<Env, "AUTH_ORIGIN">, plan: PlanId): string {
  const url = new URL("/register", env.AUTH_ORIGIN);
  url.searchParams.set("plan", plan);
  return url.toString();
}

export function loginUrl(env: Pick<Env, "AUTH_ORIGIN" | "APP_ORIGIN">): string {
  const url = new URL("/login", env.AUTH_ORIGIN);
  url.searchParams.set("return_to", `${env.APP_ORIGIN}/dashboard`);
  return url.toString();
}
