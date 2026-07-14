export function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

export function getLoginRedirectUrl(authBaseUrl: string, appBaseUrl: string, callbackPath = "/auth/callback"): string {
  const redirectUri = new URL(callbackPath, ensureTrailingSlash(appBaseUrl)).toString();
  const url = new URL("login", ensureTrailingSlash(authBaseUrl));
  url.searchParams.set("redirect_uri", redirectUri);
  return url.toString();
}

export function getRegisterRedirectUrl(
  authBaseUrl: string,
  appBaseUrl: string,
  callbackPath = "/auth/callback",
  plan?: string,
): string {
  const redirectUri = new URL(callbackPath, ensureTrailingSlash(appBaseUrl)).toString();
  const url = new URL("register", ensureTrailingSlash(authBaseUrl));
  url.searchParams.set("redirect_uri", redirectUri);

  if (plan) {
    url.searchParams.set("plan", plan);
  }

  return url.toString();
}
