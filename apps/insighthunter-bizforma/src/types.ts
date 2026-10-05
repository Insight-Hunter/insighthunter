export interface BizformaEnv {
  BIZFORMA_DB: D1Database;
  BIZFORMA_DOCUMENTS: R2Bucket;
  BIZFORMA_CACHE: KVNamespace;
  PDF_QUEUE: Queue<{ type: string; doc_id: string; r2_key: string }>;
  REMINDER_QUEUE: Queue<{ type: string; case_id: string; event_id: string; user_id: string }>;
  ANALYTICS: AnalyticsEngineDataset;
  FORMATION_AGENT: DurableObjectNamespace;
  COMPLIANCE_AGENT: DurableObjectNamespace;
  AI: Ai;
  APP_NAME: string;
  ENVIRONMENT: string;
  AUTH_URL: string;
  APP_URL: string;
  JWKS_URL: string;
  JWT_SECRET?: string;
  INTERNAL_SECRET?: string;
}

export type AppBindings = {
  Bindings: BizformaEnv;
  Variables: {
    orgId: string;
    userId: string;
    requestId: string;
    authToken?: string;
  };
};

export type CaseStatus =
  | "draft"
  | "in_review"
  | "active"
  | "filed"
  | "completed"
  | "blocked"
  | "cancelled";

export type ComplianceStatus = "pending" | "due_soon" | "overdue" | "completed";

export type DocumentStatus = "pending" | "processing" | "ready" | "rejected";

export interface ApiErrorShape {
  error: string;
  code?: string;
  details?: unknown;
}

export interface DashboardStats {
  total: number;
  active: number;
  draft: number;
  filed: number;
  overdue: number;
  due_soon: number;
  blocked: number;
  pending_signatures: number;
  open_tasks: number;
  pending_documents: number;
}
