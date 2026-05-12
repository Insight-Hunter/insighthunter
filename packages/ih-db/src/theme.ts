export const theme = {
  colors: {
    background: '#0d0d0d',
    backgroundNavy: '#141522',
    surface: '#141414',
    surfaceAlt: '#1a1a1a',
    surfaceCard: '#1c1b19',
    gold: '#C9A84C',
    white: '#FFFFFF',
    muted: '#999999',
    error: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
  },
  typography: {
    display: "'General Sans', 'Inter', sans-serif",
    body: "'Satoshi', 'Inter', sans-serif",
    fontWeightBold: '700',
    fontWeightRegular: '400',
  },
  borderRadius: {
    card: '16px',
    button: '8px',
    input: '6px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
} as const;

export type Theme = typeof theme;
