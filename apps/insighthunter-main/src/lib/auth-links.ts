export type Plan = "lite" | "standard" | "pro";

const AUTH_ORIGIN = "https://auth.insighthunter.app";
const APP_ORIGIN = "https://app.insighthunter.app";

function dashboardUrl(path = "/dashboard"): string {
  return new URL(path, APP_ORIGIN).toString();
}

export function loginUrl(path = "/dashboard"): string {
  const url = new URL("/login", AUTH_ORIGIN);
  url.searchParams.set("returnTo", dashboardUrl(path));
  return url.toString();
}

export function registerUrl(plan: Plan = "lite", path = "/dashboard"): string {
  const url = new URL("/register", AUTH_ORIGIN);
  url.searchParams.set("plan", plan);
  url.searchParams.set("returnTo", dashboardUrl(path));
  return url.toString();
}
