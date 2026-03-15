// ── Cloudflare Bindings ──────────────────────────────────────────────
export interface Env {
    DB:                 D1Database;
    KV:                 KVNamespace;
    R2:                 R2Bucket;
    DOCUMENT_QUEUE:     Queue<DocumentJobPayload>;
    REMINDER_QUEUE:     Queue<ReminderJobPayload>;
    FORMATION_AGENT:    DurableObjectNamespace;
    COMPLIANCE_AGENT:   DurableObjectNamespace;
    AI:                 Ai;
    ANALYTICS:          AnalyticsEngineDataset;
    AUTH_WORKER:        Fetcher;
    BOOKKEEPING_WORKER: Fetcher;
    JWT_SECRET:         string;
  }
  
  // ── Auth ─────────────────────────────────────────────────────────────
  export interface AuthContext {
    userId: string;
    orgId:  string;
    role:   'owner' | 'admin' | 'member';
  }
  
  // ── Entity Types ──────────────────────────────────────────────────────
  export type EntityType = 'sole_prop' | 'llc' | 's_corp' | 'c_corp' | 'partnership';
  
  export type FormationStatus =
    | 'QUESTIONNAIRE'
    | 'ENTITY_SELECTED'
    | 'EIN_PENDING'
    | 'EIN_COMPLETE'
    | 'STATE_REG_PENDING'
    | 'STATE_REG_COMPLETE'
    | 'TAX_SETUP_PENDING'
    | 'TAX_SETUP_COMPLETE'
    | 'COMPLETE';
  
  // ── Formation Case ────────────────────────────────────────────────────
  export interface FormationCase {
    id:               string;
    orgId:            string;
    userId:           string;
    businessName:     string;
    entityType:       EntityType | null;
    status:           FormationStatus;
    state:            string;             // 2-letter state code
    createdAt:        string;
    updatedAt:        string;
  }
  
  // ── Questionnaire ─────────────────────────────────────────────────────
  export interface QuestionnaireAnswer {
    id:            string;
    caseId:        string;
    questionKey:   string;
    answer:        string;
    answeredAt:    string;
  }
  
  export interface EntityRecommendation {
    recommended:   EntityType;
    score:         Record<EntityType, number>;
    reasoning:     string;
    warnings:      string[];
  }
  
  // ── EIN Application ───────────────────────────────────────────────────
  export interface EINApplication {
    id:             string;
    caseId:         string;
    legalName:      string;
    tradeNameDBA:   string | null;
    responsibleParty: string;
    ssn:            string;             // encrypted at rest
    address:        AddressRecord;
    entityType:     EntityType;
    reasonForApplying: string;
    status:         'draft' | 'submitted' | 'approved';
    ein:            string | null;
    submittedAt:    string | null;
    createdAt:      string;
  }
  
  // ── State Registration ────────────────────────────────────────────────
  export interface StateRegistration {
    id:           string;
    caseId:       string;
    state:        string;
    filingType:   'articles_of_org' | 'articles_of_inc' | 'dba' | 'foreign_qual';
    filingFee:    number;              // cents
    status:       'pending' | 'filed' | 'approved' | 'rejected';
    confirmationNumber: string | null;
    filedAt:      string | null;
    createdAt:    string;
  }
  
  // ── Tax Accounts ──────────────────────────────────────────────────────
  export interface TaxAccount {
    id:           string;
    caseId:       string;
    accountType:  'eftps' | 'state_income' | 'state_sales' | 'state_unemployment';
    status:       'not_started' | 'in_progress' | 'complete';
    accountId:    string | null;
    completedAt:  string | null;
    createdAt:    string;
  }
  
  // ── Compliance ────────────────────────────────────────────────────────
  export interface ComplianceEvent {
    id:           string;
    orgId:        string;
    caseId:       string;
    eventType:    string;             // e.g. 'annual_report', 'boi_report', 'tax_filing'
    title:        string;
    dueDate:      string;
    status:       'upcoming' | 'overdue' | 'complete';
    reminderSent: boolean;
    createdAt:    string;
  }
  
  // ── Documents ─────────────────────────────────────────────────────────
  export interface FormationDocument {
    id:           string;
    caseId:       string;
    name:         string;
    r2Key:        string;
    mimeType:     string;
    sizeBytes:    number;
    uploadedAt:   string;
  }
  
  // ── Queue Payloads ────────────────────────────────────────────────────
  export interface DocumentJobPayload {
    caseId:   string;
    docId:    string;
    orgId:    string;
    action:   'process' | 'notify';
  }
  
  export interface ReminderJobPayload {
    orgId:       string;
    caseId:      string;
    eventId:     string;
    reminderType: 'email' | 'in_app';
  }
  
  // ── Shared ────────────────────────────────────────────────────────────
  export interface AddressRecord {
    street:  string;
    city:    string;
    state:   string;
    zip:     string;
    country: string;
  }
  