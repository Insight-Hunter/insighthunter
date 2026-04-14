export type AnalyticsEvent = {
  type: string;
  tenantId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
};

export function trackEvent(writeDataPoint: ((data: any) => void) | undefined, event: AnalyticsEvent) {
  if (!writeDataPoint) return;
  writeDataPoint({
    blobs: [event.type, event.tenantId || '', event.userId || ''],
    doubles: [Date.now()],
    indexes: [JSON.stringify(event.metadata || {})],
  });
}
