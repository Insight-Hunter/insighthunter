const authBaseUrl = import.meta.env["PUBLIC_AUTH_API_URL"] || "https://auth.insighthunter.app";
const dashboardBaseUrl = import.meta.env["PUBLIC_APP_BASE_URL"] || "https://app.insighthunter.app";

export const getSignupUrl = (plan = "lite"): string =>
  `${authBaseUrl}/register?plan=${encodeURIComponent(plan)}&returnTo=${encodeURIComponent(`${dashboardBaseUrl}/dashboard`)}`;

export const getLoginUrl = (): string =>
  `${authBaseUrl}/login?returnTo=${encodeURIComponent(`${dashboardBaseUrl}/dashboard`)}`;
