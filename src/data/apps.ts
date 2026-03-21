// src/data/apps.ts
import type { AppDefinition } from '../types';

export const APPS: AppDefinition[] = [
  {
    slug: 'bookkeeping',
    name: 'Bookkeeping',
    description: 'Double-entry ledger, chart of accounts, and P&L',
    tier: 'lite',
    route: '/dashboard/bookkeeping',
    icon: 'book-open',
  },
  {
    slug: 'bizforma',
    name: 'BizForma',
    description: 'Business formation, EIN, state registration & compliance',
    tier: 'lite',
    route: '/dashboard/bizforma',
    icon: 'building-office',
  },
  {
    slug: 'insights',
    name: 'AI CFO Insights',
    description: 'AI-powered cash flow insights and financial alerts',
    tier: 'standard',
    route: '/dashboard/insights',
    icon: 'sparkles',
    badge: 'AI',
  },
  {
    slug: 'forecast',
    name: 'Cash Flow Forecast',
    description: '90-day rolling cash flow projections',
    tier: 'standard',
    route: '/dashboard/forecast',
    icon: 'chart-bar',
  },
  {
    slug: 'reports',
    name: 'Reports',
    description: 'P&L, balance sheet, and exportable PDF reports',
    tier: 'lite',
    route: '/dashboard/reports',
    icon: 'document-chart-bar',
  },
  {
    slug: 'pbx',
    name: 'Virtual PBX',
    description: 'Cloud phone system with IVR, extensions, and voicemail',
    tier: 'standard',
    route: '/dashboard/pbx',
    icon: 'phone',
    badge: 'New',
  },
  {
    slug: 'payroll',
    name: 'Payroll',
    description: 'Payroll processing, tax filings, and W-2/1099 management',
    tier: 'pro',
    route: '/dashboard/payroll',
    icon: 'banknotes',
    badge: 'Soon',
  },
  {
    slug: 'scout',
    name: 'Scout',
    description: 'Lead intelligence and business prospecting',
    tier: 'pro',
    route: '/dashboard/scout',
    icon: 'magnifying-glass',
  },
  {
    slug: 'website-services',
    name: 'Website Services',
    description: 'Managed website and landing page services',
    tier: 'pro',
    route: '/dashboard/website-services',
    icon: 'globe-alt',
  },
];

export function getAppsByTier(userTier: string): AppDefinition[] {
  const ORDER: Record<string, number> = { free: 0, lite: 1, standard: 2, pro: 3, enterprise: 4 };
  const userLevel = ORDER[userTier] ?? 0;
  return APPS.filter(app => (ORDER[app.tier] ?? 99) <= userLevel);
}

export function getApp(slug: string): AppDefinition | undefined {
  return APPS.find(a => a.slug === slug);
}

