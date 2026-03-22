// src/middleware/index.ts
import { defineMiddleware } from 'astro:middleware';
import type { TierSlug } from '../data/pricing';
import type { FeatureKey } from '../data/features';
import { canAccess } from '../data/features';

/** Maps dashboard route prefixes to the feature required to access them */
const ROUTE_FEATURE_MAP: Record<string, FeatureKey> = {
  '/dashboard/forecast':    'cash_flow_forecast',
  '/dashboard/insights':    'ai_cfo_insights',
  '/dashboard/bookkeeping': 'bookkeeping_manual', // base access; sync/auto checked in-page
  '/dashboard/reports':     'pl_report_basic',
};

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Only guard dashboard routes
  if (!pathname.startsWith('/dashboard')) return next();

  // Allow the upgrade page through unconditionally
  if (pathname.startsWith('/dashboard/upgrade')) return next();

  // Resolve session — set by insighthunter-auth worker via cookie
  const session = context.locals.session as
    | { userId: string; tier: TierSlug }
    | null
    | undefined;

  if (!session) {
    return context.redirect(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
  }

  const userTier = session.tier ?? 'lite';

  // Check route-level feature gate
  for (const [routePrefix, feature] of Object.entries(ROUTE_FEATURE_MAP)) {
    if (pathname.startsWith(routePrefix)) {
      if (!canAccess(userTier, feature)) {
        return context.redirect(
          `/dashboard/upgrade?feature=${feature}&from=${encodeURIComponent(pathname)}`
        );
      }
      break;
    }
  }

  // Attach tier to locals for downstream use in components
  context.locals.tier = userTier;
  return next();
});
