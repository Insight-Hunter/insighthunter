export enum EntityType {
    SOLE_PROP  = 'SOLE_PROP',
    LLC        = 'LLC',
    S_CORP     = 'S_CORP',
    C_CORP     = 'C_CORP',
    PARTNERSHIP = 'PARTNERSHIP',
    NONPROFIT  = 'NONPROFIT',
  }
  
  export enum FormationStatus {
    INTAKE        = 'INTAKE',
    ENTITY_CHOSEN = 'ENTITY_CHOSEN',
    FILING        = 'FILING',
    EIN_PENDING   = 'EIN_PENDING',
    TAX_SETUP     = 'TAX_SETUP',
    COMPLETE      = 'COMPLETE',
  }
  
  export enum TaskStatus {
    PENDING     = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETE    = 'COMPLETE',
    SKIPPED     = 'SKIPPED',
    BLOCKED     = 'BLOCKED',
  }
  
  export enum TaskType {
    CHOOSE_ENTITY       = 'CHOOSE_ENTITY',
    RESERVE_NAME        = 'RESERVE_NAME',
    FILE_ARTICLES       = 'FILE_ARTICLES',
    GET_EIN             = 'GET_EIN',
    OPEN_BANK_ACCOUNT   = 'OPEN_BANK_ACCOUNT',
    SETUP_IRS_ACCOUNT   = 'SETUP_IRS_ACCOUNT',
    SETUP_STATE_TAX     = 'SETUP_STATE_TAX',
    ELECT_S_CORP        = 'ELECT_S_CORP',
    DRAFT_OP_AGREEMENT  = 'DRAFT_OP_AGREEMENT',
    DRAFT_BYLAWS        = 'DRAFT_BYLAWS',
    REGISTER_AGENT      = 'REGISTER_AGENT',
    BOI_FINCEN          = 'BOI_FINCEN',
  }
  
  export interface IntakeAnswers {
    businessConcept:    string;
    targetMarket:       string;
    valueProposition:   string;
    businessName:       string;
    alternateNames:     string[];
    state:              string;
    memberCount:        number;
    hasEmployees:       boolean;
    annualRevEstimate:  number;
    liabilityExposure:  'low' | 'medium' | 'high';
    taxGoal:            'minimize_se_tax' | 'simplicity' | 'investor_ready' | 'nonprofit';
    hasCoBusiness:      boolean;
    fundingPlan:        string;
    marketingChannels:  string[];
    domain:             string;
  }
  
  export interface EntityScore {
    entityType:  EntityType;
    score:       number;
    reasons:     string[];
    warnings:    string[];
  }
  
  export interface EntityRecommendation {
    recommended:  EntityType;
    scores:       EntityScore[];
    aiRationale:  string;
    generatedAt:  string;
  }
  
  export interface FormationTask {
    id:          string;
    businessId:  string;
    type:        TaskType;
    status:      TaskStatus;
    title:       string;
    description: string;
    actionUrl:   string | null;
    fee:         number | null;
    dueDate:     string | null;
    completedAt: string | null;
    meta    Record<string, unknown> | null;
    order:       number;
    createdAt:   string;
    updatedAt:   string;
  }
  
  export interface FormationCase {
    id:             string;
    orgId:          string;
    userId:         string;
    businessName:   string;
    state:          string;
    status:         FormationStatus;
    entityType:     EntityType | null;
    intake:         IntakeAnswers | null;
    recommendation: EntityRecommendation | null;
    ein:            string | null;
    tasks:          FormationTask[];
    completedAt:    string | null;
    createdAt:      string;
    updatedAt:      string;
  }
  
  export interface WizardSession {
    id:         string;
    orgId:      string;
    userId:     string;
    step:       number;
           Partial<IntakeAnswers>;
    completed:  boolean;
    expiresAt:  string;
    createdAt:  string;
    updatedAt:  string;
  }
  
  export interface Business {
    id:           string;
    orgId:        string;
    userId:       string;
    name:         string;
    entityType:   EntityType;
    state:        string;
    ein:          string | null;
    formationDate: string | null;
    status:       FormationStatus;
    intakeData:   IntakeAnswers | null;
    createdAt:    string;
    updatedAt:    string;
  }
  