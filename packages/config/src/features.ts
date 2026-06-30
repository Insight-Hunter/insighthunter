export interface FeatureFlags {
  ai: boolean;
  payroll: boolean;
  pbx: boolean;
  bizForma: boolean;
}

export const DefaultFeatures: FeatureFlags = {
  ai: true,
  payroll: false,
  pbx: false,
  bizForma: true,
};

export function loadFeatures(overrides: Partial<FeatureFlags> = {}): FeatureFlags {
  return {
    ...DefaultFeatures,
    ...overrides,
  };
}
