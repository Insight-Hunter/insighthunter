export interface Env {
  DB: D1Database;
  R2_DOCS: R2Bucket;
  AUTH_WORKER_URL: string;
  ANALYTICS: AnalyticsEngineDataset;
  FORMATION_AGENT: DurableObjectNamespace<FormationAgent>;
  COMPLIANCE_AGENT: DurableObjectNamespace<ComplianceAgent>;
}

export interface FormationCase {
  id: string;
  userId: string;
  status: 'NEW' | 'IN_PROGRESS' | 'FILED' | 'COMPLETE' | 'CANCELLED';
  entityType: string | null;
  state: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  error: string;
  details?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
}

export interface FormationAgent extends DurableObject {}
export interface ComplianceAgent extends DurableObject {}
