export const tiers = [
  {
    id: 'lite' as const,
    name: 'Insight Lite',
    price: 0,
    annualPrice: 0,
    badge: null,
    description: 'Perfect for getting started — no card required.',
    features: [
      'Basic bookkeeping (up to 150 txns/mo)',
      'P&L statement',
      'Cash flow overview',
      'BizForma: 1 business setup',
      '1 user',
    ],
  },
  {
    id: 'standard' as const,
    name: 'Insight Standard',
    price: 49,
    annualPrice: 470,
    badge: 'Most Popular',
    description: 'Everything growing businesses need to run lean and smart.',
    features: [
      'Full bookkeeping (unlimited txns)',
      'Bank sync (Plaid)',
      'Payroll (up to 5 employees)',
      'AI CFO insights',
      'Financial reports + export',
      'Scout CRM (50 leads)',
      '3 users',
    ],
  },
  {
    id: 'pro' as const,
    name: 'Insight Pro',
    price: 129,
    annualPrice: 1238,
    badge: null,
    description: 'The full operating system for high-velocity operators.',
    features: [
      'Everything in Standard',
      'Unlimited employees + payroll runs',
      'PBX phone system (10 extensions)',
      'Advanced AI forecasting',
      'Scout CRM (unlimited)',
      'White-label reports',
      'API access',
      'Priority support',
      'Unlimited users',
    ],
  },
];

export const addons = [
  { id: 'pbx',            name: 'PBX Add-On',                price: 29,  description: 'Add a cloud phone system to any plan' },
  { id: 'payroll-extra',  name: 'Payroll Extra Employees',    price: 6,   description: 'Per additional employee beyond plan limit' },
  { id: 'whitelabel',     name: 'White Label',                price: 199, description: 'Fully branded reports and dashboards' },
  { id: 'report',         name: 'Report Builder',             price: 19,  description: 'Custom report templates and exports' },
  { id: 'bizforma-extra', name: 'BizForma Extra Filings',     price: 49,  description: 'Additional business formation filings' },
  { id: 'website-services',name:'Website Services',           price: 79,  description: 'Managed landing page + hosting' },
];

export const pricingTiers = tiers;
