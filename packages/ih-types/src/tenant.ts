export interface TenantRecord {
  orgId: string;
  workerName: string;
  tier: 'lite' | 'standard' | 'pro';
  r2Prefix: string;
  kvPrefix: string;
  createdAt: string;
}
