// services/bank-statement-normalizer.ts
// Cleans descriptions and infers expense/revenue categories from merchant names.

import type { ParsedImportRow } from './csv-parser.js';

export type NormalizedBankRow = {
  sourceDate?:        string;
  sourceDescription?: string;
  sourceAmount?:      number;
  normalizedDate?:    string;
  normalizedDescription?: string;
  normalizedAmount?:  number;
  category?:          string;
  confidence:         number;
};

// Merchant → category map (case-insensitive substring match)
const MERCHANT_MAP: [string, string][] = [
  // Payroll
  ['gusto',         'Payroll'],
  ['adp',           'Payroll'],
  ['paychex',       'Payroll'],
  ['rippling',      'Payroll'],
  // SaaS / Software
  ['github',        'Software'],
  ['notion',        'Software'],
  ['slack',         'Software'],
  ['figma',         'Software'],
  ['aws',           'Cloud Infrastructure'],
  ['amazon web',    'Cloud Infrastructure'],
  ['cloudflare',    'Cloud Infrastructure'],
  ['google cloud',  'Cloud Infrastructure'],
  ['digitalocean',  'Cloud Infrastructure'],
  // Office / Supplies
  ['amazon',        'Office Supplies'],
  ['staples',       'Office Supplies'],
  ['office depot',  'Office Supplies'],
  ['bestbuy',       'Equipment'],
  ['apple',         'Equipment'],
  // Travel
  ['uber',          'Transportation'],
  ['lyft',          'Transportation'],
  ['delta',         'Travel'],
  ['united',        'Travel'],
  ['american air',  'Travel'],
  ['southwest',     'Travel'],
  ['airbnb',        'Travel'],
  ['marriott',      'Travel'],
  ['hilton',        'Travel'],
  // Food
  ['doordash',      'Meals & Entertainment'],
  ['grubhub',       'Meals & Entertainment'],
  ['uber eats',     'Meals & Entertainment'],
  ['starbucks',     'Meals & Entertainment'],
  ['chipotle',      'Meals & Entertainment'],
  // Finance
  ['stripe',        'Payment Processing'],
  ['square',        'Payment Processing'],
  ['paypal',        'Payment Processing'],
  ['interest',      'Bank Fees'],
  ['monthly fee',   'Bank Fees'],
  ['overdraft',     'Bank Fees'],
  // Utilities
  ['comcast',       'Utilities'],
  ['at&t',          'Utilities'],
  ['verizon',       'Utilities'],
  ['pg&e',          'Utilities'],
  ['electric',      'Utilities'],
  // Revenue signals
  ['payment recv',  'Revenue'],
  ['deposit',       'Revenue'],
  ['invoice',       'Revenue'],
];

function inferCategory(desc: string): { category: string; confidence: number } {
  const lower = desc.toLowerCase();
  for (const [keyword, cat] of MERCHANT_MAP) {
    if (lower.includes(keyword)) return { category: cat, confidence: 0.82 };
  }
  return { category: 'Uncategorized', confidence: 0.35 };
}

function cleanDescription(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/[*#]+/g, ' ')
    .replace(/\d{4,}/g, (m) => m.length > 8 ? '' : m) // strip long ref numbers
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function normalizeBankRow(row: ParsedImportRow): NormalizedBankRow {
  const desc  = row.description?.trim() ?? '';
  const clean = cleanDescription(desc);
  const { category, confidence } = inferCategory(clean);

  return {
    sourceDate:           row.date,
    sourceDescription:    row.description,
    sourceAmount:         row.amount,
    normalizedDate:       row.date,
    normalizedDescription: clean,
    normalizedAmount:     row.amount,
    category,
    confidence,
  };
}
