// src/data/features.ts

import type { TierSlug } from './pricing';
import { tierMeets } from './pricing';

export type FeatureKey =
  | 'pl_report_basic'
  | 'pl_report_full'
  | 'cash_flow_forecast'
  | 'ai_cfo_insights'
  | 'bookkeeping_manual'
  | 'bookkeeping_sync'
  | 'bookkeeping_auto'
  | 'kpi_dashboard_basic'   // 3 KPIs
  | 'kpi_dashboard_full'
  | 'kpi_alerts'
  | 'pdf_export'
  | 'csv_export'
  | 'multi_user'
  | 'white_label';

/** Minimum tier required to access each feature */
export const FEATURE_TIER_MAP: Record<FeatureKey, TierSlug> = {
  pl_report_basic:      'lite',
  bookkeeping_manual:   'lite',
  kpi_dashboard_basic:  'lite',
  csv_export:           'lite',

  pl_report_full:       'standard',
  cash_flow_forecast:   'standard',
  bookkeeping_sync:     'standard',
  kpi_dashboard_full:   'standard',
  pdf_export:           'standard',
  multi_user:           'standard',

  ai_cfo_insights:      'pro',
  bookkeeping_auto:     'pro',
  kpi_alerts:           'pro',
  white_label:          'pro',
};

export interface FeatureMeta {
  key: FeatureKey;
  label: string;
  description: string;
  upgradeMessage: string;
}

export const FEATURE_META: Record<FeatureKey, FeatureMeta> = {
  pl_report_basic:     { key: 'pl_report_basic',     label: 'P&L Report',             description: 'Basic profit & loss summary.',                     upgradeMessage: '' },
  pl_report_full:      { key: 'pl_report_full',      label: 'Full P&L Report',         description: 'Detailed P&L with line-item breakdown.',           upgradeMessage: 'Upgrade to Standard for full P&L reports.' },
  cash_flow_forecast:  { key: 'cash_flow_forecast',  label: 'Cash Flow Forecast',      description: '30/60/90-day cash flow projections.',              upgradeMessage: 'Upgrade to Standard to unlock cash flow forecasting.' },
  ai_cfo_insights:     { key: 'ai_cfo_insights',     label: 'AI CFO Insights',         description: 'AI-generated financial recommendations.',          upgradeMessage: 'Upgrade to Pro for AI-powered CFO insights.' },
  bookkeeping_manual:  { key: 'bookkeeping_manual',  label: 'Manual Bookkeeping',      description: 'Upload CSV transactions manually.',                upgradeMessage: '' },
  bookkeeping_sync:    { key: 'bookkeeping_sync',    label: 'Bookkeeping Sync',        description: 'Connect bank/accounting integrations.',            upgradeMessage: 'Upgrade to Standard for bookkeeping sync.' },
  bookkeeping_auto:    { key: 'bookkeeping_auto',    label: 'Auto Bookkeeping',        description: 'Automated categorization and reconciliation.',     upgradeMessage: 'Upgrade to Pro for automated bookkeeping.' },
  kpi_dashboard_basic: { key: 'kpi_dashboard_basic', label: 'KPI Dashboard (3 KPIs)',  description: 'Track your top 3 KPIs.',                           upgradeMessage: '' },
  kpi_dashboard_full:  { key: 'kpi_dashboard_full',  label: 'Full KPI Dashboard',      description: 'Unlimited KPIs with trend analysis.',             upgradeMessage: 'Upgrade to Standard for the full KPI dashboard.' },
  kpi_alerts:          { key: 'kpi_alerts',          label: 'KPI Alerts',              description: 'Get notified when KPIs cross thresholds.',         upgradeMessage: 'Upgrade to Pro for KPI alerts.' },
  pdf_export:          { key: 'pdf_export',          label: 'PDF Export',              description: 'Export reports as branded PDFs.',                  upgradeMessage: 'Upgrade to Standard to export PDF reports.' },
  csv_export:          { key: 'csv_export',          label: 'CSV Export',              description: 'Download raw data as CSV.',                        upgradeMessage: '' },
  multi_user:          { key: 'multi_user',          label: 'Multi-User',              description: 'Invite up to 5 team members.',                    upgradeMessage: 'Upgrade to Standard to add team members.' },
  white_label:         { key: 'white_label',         label: 'White Label',             description: 'Custom branding for client-facing reports.',       upgradeMessage: 'Upgrade to Pro for white-label reports.' },
};

/** Check if a given tier can access a feature */
export function canAccess(userTier: TierSlug, feature: FeatureKey): boolean {
  return tierMeets(userTier, FEATURE_TIER_MAP[feature]);
}

/** Returns all features accessible for a given tier */
export function featuresForTier(tier: TierSlug): FeatureKey[] {
  return (Object.keys(FEATURE_TIER_MAP) as FeatureKey[]).filter(
    (f) => canAccess(tier, f)
  );
}
