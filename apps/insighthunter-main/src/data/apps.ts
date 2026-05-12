export interface AppDef {
  id: string;
  name: string;
  tier: string;
  description: string;
  href: string;
  icon: string; // SVG string
}

const GOLD = '#C9A84C';
const WHITE = '#FFFFFF';

export const apps: AppDef[] = [
  {
    id: 'lite',
    name: 'Insight Lite',
    tier: 'Free',
    description: 'Basic bookkeeping, P&L, and cash flow for new businesses.',
    href: '/features/insight-lite',
    icon: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 4C20 4 12 12 12 20C12 25.5 15.6 30 20 30C24.4 30 28 25.5 28 20C28 15 26 11 26 11C26 11 25 16 20 16C15 16 17 10 20 4Z" fill="${GOLD}"/>
      <path d="M20 34L17 30H23L20 34Z" fill="${GOLD}"/>
      <path d="M22 22L26 18" stroke="${GOLD}" stroke-width="2" stroke-linecap="round"/>
      <path d="M24 18H26V20" stroke="${GOLD}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  {
    id: 'standard',
    name: 'Insight Standard',
    tier: '$49/mo',
    description: 'Full bookkeeping, payroll, AI CFO insights, and Scout CRM.',
    href: '/features/insight-standard',
    icon: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="24" width="8" height="12" fill="${GOLD}"/>
      <rect x="16" y="16" width="8" height="20" fill="${GOLD}"/>
      <rect x="28" y="8" width="8" height="28" fill="${GOLD}"/>
      <path d="M6 20L16 12L24 17L34 6" stroke="${GOLD}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="34" cy="6" r="2" fill="${GOLD}"/>
    </svg>`,
  },
  {
    id: 'pro',
    name: 'Insight Pro',
    tier: '$129/mo',
    description: 'Enterprise-grade AI CFO, PBX, unlimited payroll, forecasting.',
    href: '/features/insight-pro',
    icon: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="glow"><feGaussianBlur stdDeviation="1.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <circle cx="20" cy="10" r="3" fill="${GOLD}" filter="url(#glow)"/>
      <circle cx="8" cy="28" r="3" fill="${GOLD}" filter="url(#glow)"/>
      <circle cx="32" cy="28" r="3" fill="${GOLD}" filter="url(#glow)"/>
      <circle cx="20" cy="22" r="4" fill="${GOLD}" filter="url(#glow)"/>
      <line x1="20" y1="13" x2="20" y2="18" stroke="${GOLD}" stroke-width="1.5"/>
      <line x1="10.5" y1="26" x2="16.5" y2="23.5" stroke="${GOLD}" stroke-width="1.5"/>
      <line x1="29.5" y1="26" x2="23.5" y2="23.5" stroke="${GOLD}" stroke-width="1.5"/>
    </svg>`,
  },
  {
    id: 'pbx',
    name: 'PBX',
    tier: 'Add-On',
    description: 'Cloud phone system: extensions, IVR, voicemail transcription.',
    href: '/features/pbx',
    icon: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 8C12 8 8 12 8 16C8 20 10 22 14 24L16 22L12 18L14 14L18 18L20 16C18 12 12 8 12 8Z" fill="${WHITE}"/>
      <path d="M22 18C24 22 28 22 28 22L32 26L28 30C24 30 18 26 16 22" fill="${WHITE}"/>
      <path d="M26 8C28 8 32 10 34 12" stroke="${GOLD}" stroke-width="2" stroke-linecap="round"/>
      <path d="M24 12C26 12 29 13.5 30 16" stroke="${GOLD}" stroke-width="2" stroke-linecap="round"/>
      <path d="M22 16C23 16 25.5 17 26 20" stroke="${GOLD}" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'payroll',
    name: 'Payroll',
    tier: 'Included',
    description: 'Full payroll, W-4, 1099-NEC, direct deposit, tax withholding.',
    href: '/features/payroll',
    icon: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="14" r="8" stroke="${GOLD}" stroke-width="2"/>
      <text x="16.5" y="19" font-size="12" fill="${GOLD}" font-weight="bold">$</text>
      <circle cx="10" cy="32" r="4" fill="${GOLD}"/>
      <circle cx="20" cy="32" r="4" fill="${GOLD}"/>
      <circle cx="30" cy="32" r="4" fill="${GOLD}"/>
      <line x1="6" y1="32" x2="10" y2="28" stroke="${GOLD}" stroke-width="1.5"/>
      <line x1="34" y1="32" x2="30" y2="28" stroke="${GOLD}" stroke-width="1.5"/>
    </svg>`,
  },
  {
    id: 'bookkeeping',
    name: 'Bookkeeping',
    tier: 'Included',
    description: 'Chart of accounts, bank sync, reconciliation, journal entries.',
    href: '/features/bookkeeping',
    icon: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="8" width="12" height="24" rx="2" stroke="${WHITE}" stroke-width="2"/>
      <rect x="22" y="8" width="12" height="24" rx="2" stroke="${WHITE}" stroke-width="2"/>
      <line x1="8" y1="14" x2="16" y2="14" stroke="${GOLD}" stroke-width="1.5"/>
      <line x1="8" y1="18" x2="16" y2="18" stroke="${GOLD}" stroke-width="1.5"/>
      <line x1="8" y1="22" x2="14" y2="22" stroke="${GOLD}" stroke-width="1.5"/>
      <path d="M25 22L28 25L35 18" stroke="${GOLD}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  {
    id: 'bizforma',
    name: 'BizForma',
    tier: 'Included',
    description: '11-step business formation: EIN, entity, compliance calendar.',
    href: '/features/bizforma',
    icon: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="20" width="8" height="16" fill="${GOLD}"/>
      <rect x="16" y="14" width="8" height="22" fill="${GOLD}"/>
      <rect x="28" y="8" width="8" height="28" fill="${GOLD}"/>
      <path d="M10 26L18 20L26 24L34 14" stroke="${GOLD}" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M28 10L32 6L36 10" stroke="${GOLD}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  {
    id: 'scout',
    name: 'Scout CRM',
    tier: 'Included',
    description: 'Lead tracking, deal pipeline, AI close probability, follow-ups.',
    href: '/features/scout',
    icon: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="10" stroke="${GOLD}" stroke-width="2.5"/>
      <line x1="25" y1="25" x2="34" y2="34" stroke="${GOLD}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M10 22L14 18L18 21L24 14" stroke="${GOLD}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  {
    id: 'report',
    name: 'Report Builder',
    tier: 'Add-On',
    description: 'Drag-and-drop P&L, cash flow, and executive summary reports.',
    href: '/features/report',
    icon: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="4" width="24" height="32" rx="3" fill="${WHITE}" opacity="0.9"/>
      <line x1="12" y1="12" x2="28" y2="12" stroke="#333" stroke-width="1.5"/>
      <line x1="12" y1="17" x2="28" y2="17" stroke="#333" stroke-width="1.5"/>
      <line x1="12" y1="22" x2="22" y2="22" stroke="#333" stroke-width="1.5"/>
      <path d="M26 22L30 16L34 22Z" fill="${GOLD}"/>
    </svg>`,
  },
  {
    id: 'whitelabel',
    name: 'White Label',
    tier: '$199/mo',
    description: 'Resell Insight Hunter under your brand with custom domains.',
    href: '/features/whitelabel',
    icon: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="14" width="28" height="18" rx="3" stroke="${WHITE}" stroke-width="2"/>
      <line x1="6" y1="20" x2="34" y2="20" stroke="${WHITE}" stroke-width="1.5"/>
      <circle cx="10" cy="17" r="1.5" fill="${WHITE}"/>
      <circle cx="15" cy="17" r="1.5" fill="${WHITE}"/>
      <path d="M28 8L32 4L36 8" stroke="${GOLD}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="32" y1="4" x2="32" y2="14" stroke="${GOLD}" stroke-width="2"/>
    </svg>`,
  },
];
