// src/data/pricing.ts
export type Plan = {
  name: "Startup" | "Standard" | "Pro";
  monthlyPrice: number;
  annualMonthlyPrice: number;
  description: string;
  cta: string;
  href: string;
  featured?: boolean;
  features: string[];
};

export const plans: Plan[] = [
  {
    name: "Startup",
    monthlyPrice: 0,
    annualMonthlyPrice: 0,
    description: "A clear starting point for owners who need visibility now.",
    cta: "Start Free",
    href: "https://auth.insighthunter.app/signup?plan=startup",
    features: [
      "Financial snapshot dashboard",
      "CSV import",
      "Core business KPI view",
      "Starter reports",
    ],
  },
  {
    name: "Standard",
    monthlyPrice: 79,
    annualMonthlyPrice: 63,
    description: "For growing businesses that need planning, alerts, and regular reporting.",
    cta: "Choose Standard",
    href: "https://auth.insighthunter.app/signup?plan=standard",
    featured: true,
    features: [
      "Everything in Startup",
      "Cash-flow forecasting",
      "KPI alerts and trends",
      "Scheduled financial reports",
      "Priority support",
    ],
  },
  {
    name: "Pro",
    monthlyPrice: 199,
    annualMonthlyPrice: 159,
    description: "For businesses and advisors that need a deeper financial operating system.",
    cta: "Choose Pro",
    href: "https://auth.insighthunter.app/signup?plan=pro",
    features: [
      "Everything in Standard",
      "Advanced insights and forecasting",
      "Client-ready PDF exports",
      "Multi-business or advisor workflows",
      "Priority onboarding",
    ],
  },
];
