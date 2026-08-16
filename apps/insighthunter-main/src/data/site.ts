export const site = {
  name: "Insight Hunter",
  tagline: "Stop flying blind. Know your numbers.",
  description:
    "AI-powered bookkeeping, payroll, cash-flow forecasting, reporting, and advisory workflows for growing small businesses.",
  email: "hello@insighthunter.app",
  phone: "(555) 555-0142",
  address: "Remote-first, United States",
  nav: [
    { href: "/", label: "Home" },
    { href: "/pricing", label: "Pricing" },
    { href: "/features", label: "Features" },
    { href: "/blog", label: "Blog" },
    { href: "/kb", label: "Knowledge Base" },
    { href: "/docs", label: "Docs" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ],
  legal: [
    { href: "/legal/privacy", label: "Privacy Policy" },
    { href: "/legal/terms", label: "Terms of Service" },
    { href: "/legal/cookies", label: "Cookie Policy" },
    { href: "/legal/acceptable-use", label: "Acceptable Use" },
    { href: "/legal/security", label: "Security" },
  ],
};

export const features = [
  {
    slug: "bookkeeping",
    title: "Bookkeeping automation",
    summary: "Bank sync, reconciliation, categorization, and month-end reporting.",
  },
  {
    slug: "forecasting",
    title: "Cash-flow forecasting",
    summary: "Forward-looking cash visibility with scenario planning and alerts.",
  },
  {
    slug: "payroll",
    title: "Payroll workflows",
    summary: "Payroll operations, employer cost visibility, and compliance support.",
  },
  {
    slug: "ai-cfo",
    title: "AI CFO guidance",
    summary: "Narrative insights, trend detection, and decision support.",
  },
  {
    slug: "bizforma",
    title: "Business formation",
    summary: "Entity setup, compliance tracking, and startup operating prep.",
  },
  {
    slug: "reporting",
    title: "Operator reporting",
    summary: "P&L, cash, KPI summaries, and packaged stakeholder updates.",
  },
];

export const pricing = [
  {
    name: "Insight Lite",
    price: "$0",
    cadence: "/mo",
    description: "For solo operators who want clarity without setup friction.",
    cta: "Start free",
    featured: false,
    bullets: [
      "Up to 150 monthly transactions",
      "Basic bookkeeping views",
      "Cash snapshot",
      "Single user",
    ],
  },
  {
    name: "Insight Standard",
    price: "$49",
    cadence: "/mo",
    description: "For growing businesses replacing multiple disconnected tools.",
    cta: "Choose Standard",
    featured: true,
    bullets: [
      "Unlimited bookkeeping",
      "Payroll for small teams",
      "AI insights",
      "Forecasting and reports",
    ],
  },
  {
    name: "Insight Pro",
    price: "$129",
    cadence: "/mo",
    description: "For operators who need a more complete finance operating layer.",
    cta: "Choose Pro",
    featured: false,
    bullets: [
      "Everything in Standard",
      "Advanced forecasting",
      "White-label exports",
      "Priority support",
    ],
  },
];
