export type AppDefinition = {
  slug: string;
  name: string;
  description: string;
  shortDesc: string;
  icon: string;
  tier: 'lite' | 'standard' | 'pro';
  route: string;
  color: string;
  badge?: string;
};

export type PricingPlan = {
  id: string;
  name: string;
  slug: string;
  price: number;
  annualPrice?: number;
  oneTime?: boolean;
  description: string;
  stripePriceId: string;
  stripeAnnualPriceId?: string;
  tier: string;
  highlight?: boolean;
  badge?: string;
  cta: string;
  features: string[];
  notIncluded?: string[];
};

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
  tier: string;
}

export interface Testimonial {
  name: string;
  role: string;
  avatar: string;
  quote: string;
  tier: string;
  rating: number;
}

export interface CartItem {
  planId: string;
  name: string;
  billing: 'monthly' | 'annual' | 'one-time';
  price: number;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export type ApiResponse<T> = {
    ok: boolean;
    data?: T;
    error?: string;
    details?: any;
};