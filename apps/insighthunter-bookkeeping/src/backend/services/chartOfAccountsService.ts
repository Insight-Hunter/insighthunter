import type { D1Database } from "@cloudflare/workers-types";

export type EntityType =
  | "sole_proprietor"
  | "llc_single"
  | "llc_multi"
  | "s_corp"
  | "c_corp"
  | "partnership"
  | "nonprofit";

interface CoATemplate {
  code: string;
  name: string;
  type: string;
  subtype: string;
  description: string;
}

// Standard Chart of Accounts templates per entity type
// seeded when BizFormation completes (bookkeepingHandoffService.ts calls this)
const BASE_COA: CoATemplate[] = [
  // Assets
  {
    code: "1000",
    name: "Checking Account",
    type: "asset",
    subtype: "bank",
    description: "Primary checking account",
  },
  {
    code: "1010",
    name: "Savings Account",
    type: "asset",
    subtype: "bank",
    description: "Business savings",
  },
  {
    code: "1200",
    name: "Accounts Receivable",
    type: "asset",
    subtype: "accounts_receivable",
    description: "Amounts owed by customers",
  },
  {
    code: "1500",
    name: "Equipment",
    type: "asset",
    subtype: "fixed_asset",
    description: "Business equipment",
  },
  {
    code: "1510",
    name: "Accumulated Depreciation",
    type: "asset",
    subtype: "fixed_asset",
    description: "Contra asset for equipment",
  },
  {
    code: "1800",
    name: "Security Deposits",
    type: "asset",
    subtype: "other_asset",
    description: "Deposits held by others",
  },
  // Liabilities
  {
    code: "2000",
    name: "Accounts Payable",
    type: "liability",
    subtype: "accounts_payable",
    description: "Amounts owed to vendors",
  },
  {
    code: "2100",
    name: "Credit Card Payable",
    type: "liability",
    subtype: "credit_card",
    description: "Business credit card balance",
  },
  {
    code: "2200",
    name: "Sales Tax Payable",
    type: "liability",
    subtype: "other_current_liability",
    description: "Sales tax collected",
  },
  {
    code: "2300",
    name: "Payroll Liabilities",
    type: "liability",
    subtype: "other_current_liability",
    description: "Payroll taxes and withholdings",
  },
  // Equity
  {
    code: "3000",
    name: "Owner's Equity",
    type: "equity",
    subtype: "equity",
    description: "Owner's capital account",
  },
  {
    code: "3100",
    name: "Retained Earnings",
    type: "equity",
    subtype: "retained_earnings",
    description: "Accumulated earnings",
  },
  {
    code: "3200",
    name: "Owner's Draw",
    type: "equity",
    subtype: "equity",
    description: "Owner withdrawals",
  },
  // Revenue
  {
    code: "4000",
    name: "Service Revenue",
    type: "revenue",
    subtype: "income",
    description: "Revenue from services rendered",
  },
  {
    code: "4100",
    name: "Product Sales",
    type: "revenue",
    subtype: "income",
    description: "Revenue from product sales",
  },
  {
    code: "4900",
    name: "Other Income",
    type: "other_income",
    subtype: "other_income",
    description: "Miscellaneous income",
  },
  // Cost of Goods Sold
  {
    code: "5000",
    name: "Cost of Goods Sold",
    type: "cost_of_goods_sold",
    subtype: "cost_of_goods_sold",
    description: "Direct cost of products sold",
  },
  // Expenses
  {
    code: "6000",
    name: "Payroll Expenses",
    type: "expense",
    subtype: "expense",
    description: "Wages and salaries",
  },
  {
    code: "6010",
    name: "Payroll Tax Expense",
    type: "expense",
    subtype: "expense",
    description: "Employer payroll taxes",
  },
  {
    code: "6100",
    name: "Rent Expense",
    type: "expense",
    subtype: "expense",
    description: "Office and facility rent",
  },
  {
    code: "6110",
    name: "Utilities",
    type: "expense",
    subtype: "expense",
    description: "Electric, gas, water",
  },
  {
    code: "6200",
    name: "Office Supplies",
    type: "expense",
    subtype: "expense",
    description: "General office supplies",
  },
  {
    code: "6210",
    name: "Software & Subscriptions",
    type: "expense",
    subtype: "expense",
    description: "SaaS and software tools",
  },
  {
    code: "6300",
    name: "Marketing & Advertising",
    type: "expense",
    subtype: "expense",
    description: "Ads, marketing spend",
  },
  {
    code: "6400",
    name: "Professional Services",
    type: "expense",
    subtype: "expense",
    description: "Legal, accounting fees",
  },
  {
    code: "6500",
    name: "Insurance",
    type: "expense",
    subtype: "expense",
    description: "Business insurance premiums",
  },
  {
    code: "6600",
    name: "Travel & Meals",
    type: "expense",
    subtype: "expense",
    description: "Business travel and meals",
  },
  {
    code: "6700",
    name: "Depreciation Expense",
    type: "expense",
    subtype: "expense",
    description: "Periodic asset depreciation",
  },
  {
    code: "6800",
    name: "Bank Fees & Charges",
    type: "expense",
    subtype: "expense",
    description: "Banking and payment processing fees",
  },
  {
    code: "6900",
    name: "Miscellaneous Expense",
    type: "expense",
    subtype: "other_expense",
    description: "Other business expenses",
  },
];

// Additional accounts for entities with shareholders/payroll structure
const CORP_ADDITIONS: CoATemplate[] = [
  {
    code: "3300",
    name: "Common Stock",
    type: "equity",
    subtype: "equity",
    description: "Issued common stock",
  },
  {
    code: "3400",
    name: "Additional Paid-In Capital",
    type: "equity",
    subtype: "equity",
    description: "Capital above par value",
  },
  {
    code: "2400",
    name: "Notes Payable",
    type: "liability",
    subtype: "long_term_liability",
    description: "Long-term debt obligations",
  },
  {
    code: "6050",
    name: "Officer Compensation",
    type: "expense",
    subtype: "expense",
    description: "S-Corp officer salaries",
  },
];

const NONPROFIT_ADDITIONS: CoATemplate[] = [
  {
    code: "3000",
    name: "Net Assets Unrestricted",
    type: "equity",
    subtype: "equity",
    description: "Unrestricted net assets",
  },
  {
    code: "3010",
    name: "Net Assets Restricted",
    type: "equity",
    subtype: "equity",
    description: "Donor-restricted net assets",
  },
  {
    code: "4050",
    name: "Grants Revenue",
    type: "revenue",
    subtype: "income",
    description: "Grant income",
  },
  {
    code: "4060",
    name: "Donations & Contributions",
    type: "revenue",
    subtype: "income",
    description: "Donor contributions",
  },
];

export async function seedChartOfAccounts(
  orgId: string,
  entityType: EntityType,
  db: D1Database
): Promise<void> {
  let template = [...BASE_COA];

  if (["s_corp", "c_corp"].includes(entityType)) {
    // Override equity accounts for corporate structures
    template = template.filter((a) => !a.code.startsWith("3"));
    template.push(...CORP_ADDITIONS);
  }
  if (entityType === "nonprofit") {
    template = template.filter((a) => !a.code.startsWith("3"));
    template.push(...NONPROFIT_ADDITIONS);
  }

  const now = new Date().toISOString();
  const stmts = template.map((acct) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO accounts
           (id, org_id, name, code, type, subtype, description, is_active, balance, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        orgId,
        acct.name,
        acct.code,
        acct.type,
        acct.subtype,
        acct.description,
        now,
        now
      )
  );

  await db.batch(stmts);
}
