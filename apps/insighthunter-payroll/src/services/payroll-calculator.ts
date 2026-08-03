// services/payroll-calculator.ts
// Gross-to-net payroll calculation.
// Uses simplified federal/state withholding tables (2026 estimates).
// NOT a replacement for a licensed payroll provider — for tracking/estimation only.

export type PayrollLineInput = {
  payType:      'salary' | 'hourly';
  payRate:      number;
  days:         number;  // days in pay period
  state:        string;  // 2-letter state code
  filingStatus: 'single' | 'married';
  allowances:   number;
  deductions:   { type: string; amount: number; is_percent: number }[];
};

export type PayrollLineResult = {
  grossPay:        number;
  federalTax:      number;
  stateTax:        number;
  socialSecurity:  number;
  medicare:        number;
  otherDeductions: number;
  netPay:          number;
};

// Simplified state flat tax rates (approximate 2026)
const STATE_FLAT_RATE: Record<string, number> = {
  AL: 0.05, AK: 0.00, AZ: 0.025, AR: 0.047, CA: 0.093, CO: 0.044,
  CT: 0.065, DE: 0.066, FL: 0.00, GA: 0.055, HI: 0.08, ID: 0.058,
  IL: 0.0495, IN: 0.031, IA: 0.06, KS: 0.057, KY: 0.045, LA: 0.042,
  ME: 0.075, MD: 0.05, MA: 0.05, MI: 0.0425, MN: 0.0985, MS: 0.05,
  MO: 0.048, MT: 0.065, NE: 0.0684, NV: 0.00, NH: 0.00, NJ: 0.0637,
  NM: 0.059, NY: 0.0685, NC: 0.0499, ND: 0.0290, OH: 0.04, OK: 0.0475,
  OR: 0.099, PA: 0.0307, RI: 0.0599, SC: 0.07, SD: 0.00, TN: 0.00,
  TX: 0.00, UT: 0.0485, VT: 0.0875, VA: 0.0575, WA: 0.00, WV: 0.065,
  WI: 0.0765, WY: 0.00,
};

const FICA_SS_RATE   = 0.062;  // 6.2% employee share
const FICA_SS_WAGE_BASE = 176100; // 2026 SS wage base
const FICA_MED_RATE  = 0.0145; // 1.45%
const ADDL_MED_RATE  = 0.009;  // Additional Medicare for wages > $200k (single)

function estimateFederalTax(annualizedGross: number, status: 'single' | 'married', allowances: number): number {
  // Standard deduction 2026 approximation
  const stdDeduction = status === 'married' ? 30000 : 15000;
  const allowanceValue = 4850 * allowances; // per allowance
  const taxableIncome = Math.max(0, annualizedGross - stdDeduction - allowanceValue);

  // Simplified progressive brackets (single/married same structure here for brevity)
  const brackets = status === 'married'
    ? [[23850, 0.10], [96950, 0.12], [206700, 0.22], [394600, 0.24], [501050, 0.32], [751600, 0.35], [Infinity, 0.37]]
    : [[11925, 0.10], [48475, 0.12], [103350, 0.22], [197300, 0.24], [250525, 0.32], [626350, 0.35], [Infinity, 0.37]];

  let tax = 0;
  let prev = 0;
  for (const [limit, rate] of brackets as [number, number][]) {
    if (taxableIncome <= prev) break;
    const taxable = Math.min(taxableIncome, limit) - prev;
    tax += taxable * rate;
    prev = limit;
    if (limit === Infinity) break;
  }
  return Math.max(0, tax);
}

export function calculatePayrollLine(input: PayrollLineInput): PayrollLineResult {
  const { payType, payRate, days, state, filingStatus, allowances, deductions } = input;

  // Gross pay calculation
  let grossPay: number;
  if (payType === 'salary') {
    // Salary: prorate by days in period over 365
    grossPay = (payRate / 365) * days;
  } else {
    // Hourly: assume standard 8hr workday on weekdays
    const weekdays = Math.round(days * (5 / 7));
    grossPay = payRate * 8 * weekdays;
  }
  grossPay = parseFloat(grossPay.toFixed(2));

  // Federal withholding
  const annualized   = grossPay * (365 / days);
  const annualFedTax = estimateFederalTax(annualized, filingStatus, allowances);
  const federalTax   = parseFloat(((annualFedTax / 365) * days).toFixed(2));

  // State withholding
  const stateRate = STATE_FLAT_RATE[state.toUpperCase()] ?? 0.05;
  const stateTax  = parseFloat((grossPay * stateRate).toFixed(2));

  // FICA
  const ssWageThisCheck = Math.min(grossPay, FICA_SS_WAGE_BASE);
  const socialSecurity  = parseFloat((ssWageThisCheck * FICA_SS_RATE).toFixed(2));
  const medRate = annualized > 200000 ? FICA_MED_RATE + ADDL_MED_RATE : FICA_MED_RATE;
  const medicare = parseFloat((grossPay * medRate).toFixed(2));

  // Other deductions (health, 401k, garnishments)
  const otherDeductions = parseFloat(
    deductions.reduce((sum, d) => {
      const amt = d.is_percent ? grossPay * (d.amount / 100) : d.amount;
      return sum + amt;
    }, 0).toFixed(2)
  );

  const netPay = parseFloat(
    Math.max(0, grossPay - federalTax - stateTax - socialSecurity - medicare - otherDeductions).toFixed(2)
  );

  return { grossPay, federalTax, stateTax, socialSecurity, medicare, otherDeductions, netPay };
}
