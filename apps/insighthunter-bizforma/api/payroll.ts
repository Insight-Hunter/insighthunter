export interface W4Record {
  id: string;
  tenantId: string;
  businessId: string;
  employeeName: string;
  filingStatus: string;
  allowances?: number;
  createdAt: string;
}

export interface Contractor1099 {
  id: string;
  tenantId: string;
  businessId: string;
  contractorName: string;
  tinLast4?: string;
  amountYtd: number;
  requires1099: boolean;
}

export interface PayrollSetup {
  id: string;
  tenantId: string;
  businessId: string;
  stateCode: string;
  stateWithholdingAccount?: string;
  futaEnabled: boolean;
}
