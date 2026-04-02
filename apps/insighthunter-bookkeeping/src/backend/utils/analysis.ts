import type { AnalyticsEngineDataset } from "@cloudflare/workers-types";

export function trackEvent(
  analytics: AnalyticsEngineDataset,
  event: string,
  orgId: string,
  tier: string,
  meta: Record<string, string | number> = {}
): void {
  analytics.writeDataPoint({
    blobs: [event, orgId, tier, JSON.stringify(meta)],
    doubles: [1],
    indexes: [orgId],
  });
}
