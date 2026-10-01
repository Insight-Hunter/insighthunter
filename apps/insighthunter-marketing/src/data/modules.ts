export type ModuleId =
  | "bookkeeping"
  | "bizforma"
  | "payroll"
  | "reports"
  | "insights"
  | "pbx";

export type TierId = "startup" | "standard" | "pro";

export interface Module {
  slug: ModuleId;
  name: string;
  tagline: string;
  description: string;
  minTier: TierId;
  href: string;
}

export const MODULES: Module[] = [
  {
    slug: "bookkeeping",
    name: "Bookkeeping",
    tagline: "Double-entry ledger. Automated categorization. Real-time books.",
    description:
      "Connect your bank and card accounts and let Insight Hunter categorize every transaction against your chart of accounts. Reconcile in minutes, not hours. Startup tier covers up to 100 transactions/month; Standard and Pro remove all limits.",
    minTier: "startup",
    href: "/features/bookkeeping",
  },
  {
    slug: "reports",
    name: "Reports",
    tagline: "P&L, balance sheet, cash flow — board-ready in one click.",
    description:
      "Generate GAAP-formatted financial statements on demand. Schedule automated delivery to stakeholders. Export to PDF, Excel, or push directly to your accountant. Available from Standard tier.",
    minTier: "standard",
    href: "/features/reporting",
  },
  {
    slug: "insights",
    name: "Insights",
    tagline: "AI-powered CFO commentary on your actual numbers.",
    description:
      "Insight Hunter reads your books and surfaces variance explanations, cash runway projections, margin trends, and plain-language commentary — the kind of analysis that used to require an outside CFO. Pro tier only.",
    minTier: "pro",
    href: "/features/ai-cfo",
  },
  {
    slug: "bizforma",
    name: "BizForma",
    tagline: "Entity formation, compliance calendar, and filing assistant.",
    description:
      "From LLC formation to annual reports to registered agent filings, BizForma tracks every compliance deadline and generates the required documents. Available as an add-on from Standard tier.",
    minTier: "standard",
    href: "/features/bizforma",
  },
  {
    slug: "payroll",
    name: "Payroll",
    tagline: "Run payroll. File taxes. Never miss a deposit deadline.",
    description:
      "Full-service payroll with automatic federal and state tax calculations, direct deposit, W-2/1099 generation, and new-hire reporting. Syncs payroll entries directly into your Insight Hunter books. Available from Standard tier.",
    minTier: "standard",
    href: "/features/payroll",
  },
  {
    slug: "pbx",
    name: "PBX",
    tagline: "Business phone, SMS, voicemail, and auto-messages — unified.",
    description:
      "A dedicated business number with IVR routing, voicemail transcription, two-way SMS, and automated appointment and payment reminders. Powered by Tellio integration. Available as an add-on from Standard tier.",
    minTier: "standard",
    href: "/pbx",
  },
];
