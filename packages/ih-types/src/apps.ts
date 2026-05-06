export type AppId =
  | 'lite' | 'standard' | 'pro'
  | 'pbx' | 'payroll' | 'bookkeeping'
  | 'whitelabel' | 'report' | 'bizforma'
  | 'scout' | 'website-services';

export interface AppDefinition {
  id: AppId;
  name: string;
  description: string;
  url: string;
  tier: 'lite' | 'standard' | 'pro' | 'addon';
  features: FeatureFlag[];
}

export interface FeatureFlag {
  id: string;
  name: string;
  enabledFor: Array<'lite' | 'standard' | 'pro'>;
}

export interface PricingTier {
  id: 'lite' | 'standard' | 'pro';
  name: string;
  price: number;
  annualPrice: number;
  features: string[];
}
