export interface App {
  slug: string;
  name: string;
  description: string;
  tier: string;
  icon: string;
}

export const apps: App[] = [
  {
    slug: 'bookkeeping',
    name: 'Bookkeeping',
    description: 'Automated transaction categorization, reconciliation, and real-time P&L.',
    tier: 'Core',
    icon: '📒',
  },
  {
    slug: 'payroll',
    name: 'Payroll',
    description: 'Run payroll, manage W-2s and 1099s, and track employer costs.',
    tier: 'Standard',
    icon: '💸',
  },
  {
    slug: 'bizforma',
    name: 'BizForma',
    description: 'AI-assisted business formation wizard — LLC, S-Corp, C-Corp.',
    tier: 'Core',
    icon: '🏛️',
  },
  {
    slug: 'scout',
    name: 'Scout CRM',
    description: 'Lightweight CRM for tracking leads, deals, and revenue pipeline.',
    tier: 'Standard',
    icon: '🔭',
  },
  {
    slug: 'pbx',
    name: 'PBX Phone',
    description: 'Cloud phone system with extensions, IVR, and call recording.',
    tier: 'Pro',
    icon: '📞',
  },
  {
    slug: 'website-services',
    name: 'Website Services',
    description: 'Managed landing pages, hosting, and conversion optimization.',
    tier: 'Add-On',
    icon: '🌐',
  },
];
