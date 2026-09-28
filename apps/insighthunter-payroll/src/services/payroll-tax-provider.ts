// apps/insighthunter-payroll/src/services/payroll-tax-provider.ts
// Provider-agnostic contract. In-house tax tables (payroll-calculator.ts)
// are downgraded to an ESTIMATE-ONLY preview; the provider is the sole
// source of truth for any run that actually pays employees or files taxes.

export interface PayrollTaxProvider {
  readonly name: "check" | "gusto_embedded" | "deel";

  /** Create or sync an employee record with the provider. */
  syncEmployee(input: ProviderEmployeeInput): Promise<ProviderEmployeeResult>;

  /**
   * Submit a payroll run to the provider for authoritative gross-to-net
   * calculation, tax withholding, and (once approved) filing/payment.
   * This is the ONLY path that may produce a payroll run marked "approved".
   */
  submitRun(input: ProviderRunInput): Promise<ProviderRunResult>;

  /** Poll or receive-webhook status for a previously submitted run. */
  getRunStatus(providerRunId: string): Promise<ProviderRunStatus>;
}

export interface ProviderEmployeeInput {
  orgId: string;
  employeeId: string;
  legalName: string;
  ssnLast4?: string; // full SSN never stored/transmitted by our app — provider-hosted form only
  state: string;
  payType: "salary" | "hourly";
  payRate: number;
  filingStatus: "single" | "married";
}

export interface ProviderEmployeeResult {
  providerEmployeeId: string;
  onboardingUrl?: string; // provider-hosted W-4/I-9/direct-deposit collection
  status: "pending" | "active" | "action_required";
}

export interface ProviderRunInput {
  orgId: string;
  periodStart: string;
  periodEnd: string;
  lines: Array<{ providerEmployeeId: string; hours?: number; grossOverride?: number }>;
}

export interface ProviderRunResult {
  providerRunId: string;
  status: ProviderRunStatus;
}

export type ProviderRunStatus =
  | "draft"
  | "pending_approval"
  | "processing"
  | "paid"
  | "failed";
