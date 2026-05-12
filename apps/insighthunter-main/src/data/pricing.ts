export const tiers = [
  {
    id: 'lite' as const,
    name: 'Insight Lite',
    price: 0,
    annualPrice: 0,
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
  { id: 'pbx', name: 'PBX Add-On', price: 29 },
  { id: 'payroll-extra', name: 'Payroll (extra employees)', price: 6 },
  { id: 'whitelabel', name: 'White Label', price: 199 },
  { id: 'report', name: 'Report Builder', price: 19 },
  { id: 'bizforma-extra', name: 'BizForma (extra filings)', price: 49 },
  { id: 'website-services', name: 'Website Services', price: 79 },
];
