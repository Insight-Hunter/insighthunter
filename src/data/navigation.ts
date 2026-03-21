// src/data/navigation.ts
import type { NavItem } from '../types';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',   href: '/dashboard',              icon: 'home',                tier: 'free' },
  { label: 'Reports',     href: '/dashboard/reports',      icon: 'document-chart-bar',  tier: 'lite' },
  { label: 'Forecast',    href: '/dashboard/forecast',     icon: 'chart-bar',           tier: 'standard' },
  { label: 'Bookkeeping', href: '/dashboard/bookkeeping',  icon: 'book-open',           tier: 'lite' },
  { label: 'BizForma',    href: '/dashboard/bizforma',     icon: 'building-office',     tier: 'lite' },
  { label: 'AI Insights', href: '/dashboard/insights',     icon: 'sparkles',            tier: 'standard', badge: 'AI' },
  { label: 'PBX',         href: '/dashboard/pbx',          icon: 'phone',               tier: 'standard', badge: 'New' },
  { label: 'Payroll',     href: '/dashboard/payroll',      icon: 'banknotes',           tier: 'pro',      badge: 'Soon' },
  { label: 'Scout',       href: '/dashboard/scout',        icon: 'magnifying-glass',    tier: 'pro' },
  { label: 'Settings',    href: '/dashboard/settings',     icon: 'cog-6-tooth',         tier: 'free' },
  { label: 'Upgrade',     href: '/dashboard/upgrade',      icon: 'arrow-trending-up',   tier: 'free' },
];

export function getNavForTier(tier: string): NavItem[] {
  const ORDER: Record<string, number> = { free: 0, lite: 1, standard: 2, pro: 3, enterprise: 4 };
  const level = ORDER[tier] ?? 0;
  return NAV_ITEMS.filter(item => (ORDER[item.tier] ?? 99) <= level);
}
