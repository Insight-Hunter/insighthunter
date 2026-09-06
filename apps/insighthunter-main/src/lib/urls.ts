const authBaseUrl = import.meta.env.AUTH_BASE_URL || 'https://auth.insighthunter.app';
const dashboardBaseUrl = import.meta.env.DASHBOARD_BASE_URL || 'https://app.insighthunter.app';

export const getSignupUrl = (plan = 'startup'): string =>
  `${authBaseUrl}/signup?plan=${encodeURIComponent(plan)}`;

export const getLoginUrl = (): string =>
  `${authBaseUrl}/login?returnTo=${encodeURIComponent(`${dashboardBaseUrl}/dashboard`)}`;
