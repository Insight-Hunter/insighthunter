export interface Firm {
  id: string;
  name: string;
  owner_user_id: string;
  plan: 'starter' | 'pro' | 'enterprise';
  created_at: number;
  updated_at: number;
}

export interface FirmMember {
  id: string;
  firm_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'staff' | 'viewer';
  invited_by?: string;
  accepted_at?: number;
  created_at: number;
}

export interface FirmClient {
  id: string;
  firm_id: string;
  business_id: string;
  assigned_staff_user_id?: string;
  status: 'active' | 'inactive' | 'offboarded';
  created_at: number;
  open_alert_count?: number;
}

export interface AdvisorAlert {
  id: string;
  firm_id: string;
  business_id?: string;
  alert_type: 'missing_doc' | 'compliance_deadline' | 'anomaly' | 'task_overdue' | string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  body?: string;
  resolved_at?: number;
  created_at: number;
}

export type OverallHealth = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface BizFormaHealth {
  formation_status: string;
  entity_type: string;
  state?: string;
  registered_agent?: string;
  annual_report_due?: number;
}

export interface ComplianceHealth {
  overall: OverallHealth;
  open_tasks: number;
  missing_docs: number;
  next_deadline?: number;
  next_deadline_type?: string;
}

export interface PayrollHealth {
  status: string;
  employee_count?: number;
  next_payroll?: number;
  last_payroll?: number;
  setup_complete: boolean;
}

export interface ClientHealth {
  overall: OverallHealth;
  bizforma: BizFormaHealth;
  compliance: ComplianceHealth;
  payroll: PayrollHealth;
  ai_alert_count: number;
  stitched_at?: number;
}

export interface ClientOverview {
  client: FirmClient;
  health: ClientHealth;
  alerts: AdvisorAlert[];
  notes: AdvisorNote[];
}

export interface AdvisorNote {
  id: string;
  author_user_id: string;
  body: string;
  pinned: number;
  created_at: number;
}
