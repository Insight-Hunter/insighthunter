import type { AnalyticsEngineDataset } from '@cloudflare/workers-types';

export type BookkeepingEvent =
  | 'transaction_created'
  | 'transaction_imported'
  | 'transaction_categorized'
  | 'journal_entry_created'
  | 'reconciliation_started'
  | 'reconciliation_completed'
  | 'statement_generated'
  | 'export_completed'
  | 'import_completed'
  | 'import_failed';

export function trackEvent(
  analytics: AnalyticsEngineDataset,
  event: BookkeepingEvent,
  orgId: string,
  meta: Record<string, string | number> = {},
): void {
  analytics.writeDataPoint({
    blobs:   [event, orgId, meta.currency as string ?? 'USD', meta.source as string ?? ''],
    doubles: [meta.amount as number ?? 0, meta.count as number ?? 1],
    indexes: [orgId],
  });
}
