export function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
export function getLoginRedirectUrl(
  authBaseUrl: string,
  appBaseUrl?: string,
  callbackPath = "/auth/callback"
): string {
  const url = new URL("/login", authBaseUrl);

  if (appBaseUrl) {
    url.searchParams.set("redirect_uri", new URL(callbackPath, appBaseUrl).toString());
  }

  return url.toString();
}

export function getRegisterRedirectUrl(
  authBaseUrl: string,
  appBaseUrl?: string,
  callbackPath = "/auth/callback",
  plan?: string
): string {
  const url = new URL("/register", authBaseUrl);

  if (appBaseUrl) {
    url.searchParams.set("redirect_uri", new URL(callbackPath, appBaseUrl).toString());
  }

  if (plan) {
    url.searchParams.set("plan", plan);
  }

  return url.toString();
}


