export function trackEvent(
    analytics: AnalyticsEngineDataset,
    event:     string,
    orgId:     string,
    extras:    Record<string, string | number> = {},
  ): void {
    analytics.writeDataPoint({
      blobs:   [event, orgId, ...Object.values(extras).map(String)],
      indexes: [orgId],
    });
  }
  