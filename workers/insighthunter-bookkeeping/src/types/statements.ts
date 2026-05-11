export interface PLLineItem {
    accountId: string;
    accountCode: string;
    accountName: string;
    amount: number; // cents
    subItems?: PLLineItem[];
  }
  
  export interface PLStatement {
    orgId: string;
    periodStart: string;
    periodEnd: string;
    currency: string;
    revenue: PLLineItem[];
    totalRevenue: number;
    cogs: PLLineItem[];
    totalCogs: number;
    grossProfit: number;
    grossMarginPct: number;
    expenses: PLLineItem[];
    totalExpenses: number;
    operatingIncome: number;
    otherIncome: PLLineItem[];
    otherExpenses: PLLineItem[];
    netIncome: number;
    netMarginPct: number;
    generatedAt: string;
  }
  
  export interface BalanceSheetLineItem {
    accountId: string;
    accountCode: string;
    accountName: string;
    balance: number; // cents
    subItems?: BalanceSheetLineItem[];
  }
  
  export interface BalanceSheet {
    orgId: string;
    asOf: string;
    currency: string;
    assets: {
      current: BalanceSheetLineItem[];
      nonCurrent: BalanceSheetLineItem[];
      totalCurrent: number;
      totalNonCurrent: number;
      total: number;
    };
    liabilities: {
      current: BalanceSheetLineItem[];
      nonCurrent: BalanceSheetLineItem[];
      totalCurrent: number;
      totalNonCurrent: number;
      total: number;
    };
    equity: {
      items: BalanceSheetLineItem[];
      retainedEarnings: number;
      total: number;
    };
    totalLiabilitiesAndEquity: number;
    isBalanced: boolean;
    generatedAt: string;
  }
  
  export interface CashFlowLineItem {
    label: string;
    accountId?: string;
    amount: number; // cents; positive = inflow, negative = outflow
  }
  
  export interface CashFlowStatement {
    orgId: string;
    periodStart: string;
    periodEnd: string;
    currency: string;
    operating: { items: CashFlowLineItem[]; netCash: number };
    investing: { items: CashFlowLineItem[]; netCash: number };
    financing: { items: CashFlowLineItem[]; netCash: number };
    netChangeInCash: number;
    beginningCash: number;
    endingCash: number;
    generatedAt: string;
  }
  