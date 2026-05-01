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

export interface ClientHealth {
  formation_status: string;
  compliance_health: string;
  payroll_status: string;
  ai_alert_count: number;
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
