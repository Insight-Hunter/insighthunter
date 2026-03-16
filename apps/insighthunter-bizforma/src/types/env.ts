export interface Env {
    DB:               D1Database;
    KV:               KVNamespace;
    R2:               R2Bucket;
    DOCUMENT_QUEUE:   Queue<DocumentJobPayload>;
    REMINDER_QUEUE:   Queue<ReminderJobPayload>;
    FORMATION_AGENT:  DurableObjectNamespace;
    COMPLIANCE_AGENT: DurableObjectNamespace;
    AI:               Ai;
    ANALYTICS:        AnalyticsEngineDataset;
    AUTH_WORKER:      Fetcher;
    BOOKKEEPING_WORKER: Fetcher;
    JWT_SECRET:       string;
    CORS_ORIGINS:     string;
    ENVIRONMENT:      'development' | 'staging' | 'production';
    APP_BASE_URL:     string;
    ANTHROPIC_API_KEY?: string;
  }
  
  export interface AuthContext {
    userId: string;
    orgId:  string;
    role:   'owner' | 'admin' | 'member' | 'viewer';
    plan:   'free' | 'pro' | 'white_label';
  }
  
  export interface DocumentJobPayload {
    orgId:      string;
    businessId: string;
    docType:    string;
    html:       string;
    r2Key:      string;
  }
  
  export interface ReminderJobPayload {
    orgId:       string;
    businessId:  string;
    eventId:     string;
    eventTitle:  string;
    dueDate:     string;
    userEmail:   string;
  }
  