export type Organization = { id: string; name: string };
export type Subscription = { id: string; organizationId: string; planCode: string; status: string };
export type Entitlement = { id: string; organizationId: string; featureKey: string };
