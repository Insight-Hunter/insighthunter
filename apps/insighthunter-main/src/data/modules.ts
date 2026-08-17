export interface Module {
  slug: string;
  name: string;
  minTier: "startup" | "standard" | "pro";
  tagline: string;
  description: string;
}

export const MODULES: Module[] = [
  {
    slug: "bookkeeping",
    name: "Bookkeeping",
    minTier: "startup",
    tagline: "Transactions and reconciliation, automated.",
    description:
      "Bank and card feeds auto-categorize transactions, flag anomalies, and keep your books reconciled without manual data entry.",
  },
  {
    slug: "reports",
    name: "Reports",
    minTier: "startup",
    tagline: "P&L, cash flow, and balance sheet — always current.",
    description:
      "Standard financial statements generated automatically from your bookkeeping data, exportable as PDF or CSV.",
  },
  {
    slug: "insights",
    name: "Insights",
    minTier: "standard",
    tagline: "AI CFO-grade advisory, on demand.",
    description:
      "Cash flow forecasting, margin analysis, and plain-English recommendations powered by your real financial data.",
  },
  {
    slug: "bizforma",
    name: "BizForma",
    minTier: "standard",
    tagline: "Business formation and ongoing compliance.",
    description:
      "Entity selection guidance, EIN application support, state registration, and a compliance calendar so you never miss a filing.",
  },
  {
    slug: "payroll",
    name: "Payroll",
    minTier: "pro",
    tagline: "Run payroll without the compliance headache.",
    description:
      "Tiered payroll processing with tax withholding, direct deposit, and filings handled through a white-label payroll partner.",
  },
  {
    slug: "pbx",
    name: "PBX",
    minTier: "pro",
    tagline: "A business phone system, built in.",
    description:
      "Voice, SMS, voicemail, and automated messages for customer communication — no separate phone vendor required.",
  },
];
