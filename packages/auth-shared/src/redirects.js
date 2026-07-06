export function buildAuthRedirectUrl(
  authBaseUrl: string,
  path: "login" | "register",
  redirectUri: string,
  plan?: string,
): string {
  const url = new URL(path, ensureTrailingSlash(authBaseUrl));
  url.searchParams.set("redirect_uri", redirectUri);

  if (plan) {
    url.searchParams.set("plan", plan);
  }

  return url.toString();
}

export function getLoginRedirectUrl(
  authBaseUrl: string,
  appBaseUrl: string,
  callbackPath = "/auth/callback",
): string {
  const redirectUri = new URL(callbackPath, ensureTrailingSlash(appBaseUrl)).toString();

  return buildAuthRedirectUrl(authBaseUrl, "login", redirectUri);
}

export function getRegisterRedirectUrl(
  authBaseUrl: string,
  appBaseUrl: string,
  callbackPath = "/auth/callback",
  plan?: string,
): string {
  const redirectUri = new URL(callbackPath, ensureTrailingSlash(appBaseUrl)).toString();

  return buildAuthRedirectUrl(authBaseUrl, "register", redirectUri, plan);
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

