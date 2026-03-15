export enum ComplianceEventType {
    ANNUAL_REPORT       = 'ANNUAL_REPORT',
    BOI_FINCEN          = 'BOI_FINCEN',
    REGISTERED_AGENT    = 'REGISTERED_AGENT',
    BUSINESS_LICENSE    = 'BUSINESS_LICENSE',
    TAX_RETURN          = 'TAX_RETURN',
    ESTIMATED_TAX       = 'ESTIMATED_TAX',
    SALES_TAX           = 'SALES_TAX',
    PAYROLL_TAX         = 'PAYROLL_TAX',
    S_CORP_ELECTION     = 'S_CORP_ELECTION',
    FORM_1099_DEADLINE  = 'FORM_1099_DEADLINE',
    FORM_W2_DEADLINE    = 'FORM_W2_DEADLINE',
    OTHER               = 'OTHER',
  }
  
  export enum ComplianceStatus {
    UPCOMING   = 'UPCOMING',
    DUE_SOON   = 'DUE_SOON',    // within 30 days
    OVERDUE    = 'OVERDUE',
    COMPLETE   = 'COMPLETE',
    WAIVED     = 'WAIVED',
  }
  
  export interface ComplianceEvent {
    id:          string;
    orgId:       string;
    businessId:  string;
    type:        ComplianceEventType;
    status:      ComplianceStatus;
    title:       string;
    description: string | null;
    dueDate:     string;
    fee:         number | null;
    actionUrl:   string | null;
    recurring:   boolean;
    recurrenceRule: string | null;    // 'ANNUAL' | 'QUARTERLY' | 'MONTHLY'
    completedAt: string | null;
    reminderSent: boolean;
    createdAt:   string;
    updatedAt:   string;
  }
  
  export interface RenewalSchedule {
    id:              string;
    orgId:           string;
    businessId:      string;
    entityType:      string;
    state:           string;
    annualReportDue: string;
    annualReportFee: number;
    boiInitialDue:   string;
    boiAnnualDue:    string;
    estimatedTaxQ1:  string;
    estimatedTaxQ2:  string;
    estimatedTaxQ3:  string;
    estimatedTaxQ4:  string;
    createdAt:       string;
    updatedAt:       string;
  }
  