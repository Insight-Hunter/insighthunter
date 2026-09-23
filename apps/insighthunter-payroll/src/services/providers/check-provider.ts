// apps/insighthunter-payroll/src/services/providers/check-provider.ts
// Adapter for Check (checkhq.com) Embedded Payroll API.
// Docs: https://checkhq.com/docs — endpoints referenced here are illustrative
// of Check's employee + payroll-run resources; confirm exact paths/fields
// against Check's current API reference before go-live.

import type {
  PayrollTaxProvider,
  ProviderEmployeeInput,
  ProviderEmployeeResult,
  ProviderRunInput,
  ProviderRunResult,
  ProviderRunStatus,
} from "../payroll-tax-provider.js";

export interface CheckProviderConfig {
  apiKey: string;
  baseUrl?: string; // default https://api.checkhq.com
}

export class CheckPayrollProvider implements PayrollTaxProvider {
  readonly name = "check" as const;
  private readonly baseUrl: string;

  constructor(private readonly config: CheckProviderConfig) {
    this.baseUrl = config.baseUrl ?? "https://api.checkhq.com";
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(`Check API error (${res.status}): ${JSON.stringify(json)}`);
    }
    return json as T;
  }

  async syncEmployee(input: ProviderEmployeeInput): Promise<ProviderEmployeeResult> {
    const result = await this.request<{
      id: string;
      onboard: { onboarding_url?: string };
      onboard_status: string;
    }>("/employees", {
      method: "POST",
      body: JSON.stringify({
        first_name: input.legalName.split(" ")[0],
        last_name: input.legalName.split(" ").slice(1).join(" ") || input.legalName,
        external_id: `${input.orgId}:${input.employeeId}`,
        employment: {
          type: input.payType,
          pay_rate: { amount: String(input.payRate), period: input.payType === "salary" ? "annually" : "hourly" },
        },
        residence: { state: input.state },
      }),
    });

    return {
      providerEmployeeId: result.id,
      onboardingUrl: result.onboard?.onboarding_url,
      status:
        result.onboard_status === "completed"
          ? "active"
          : result.onboard_status === "blocking"
            ? "action_required"
            : "pending",
    };
  }

  async submitRun(input: ProviderRunInput): Promise<ProviderRunResult> {
    const result = await this.request<{ id: string; status: string }>("/payrolls", {
      method: "POST",
      body: JSON.stringify({
        period: { start_date: input.periodStart, end_date: input.periodEnd },
        items: input.lines.map((l) => ({
          employee: l.providerEmployeeId,
          hours: l.hours,
          gross_override: l.grossOverride,
        })),
      }),
    });
    return { providerRunId: result.id, status: this.mapStatus(result.status) };
  }

  async getRunStatus(providerRunId: string): Promise<ProviderRunStatus> {
    const result = await this.request<{ status: string }>(`/payrolls/${providerRunId}`);
    return this.mapStatus(result.status);
  }

  private mapStatus(checkStatus: string): ProviderRunStatus {
    switch (checkStatus) {
      case "draft": return "draft";
      case "pending_approval": return "pending_approval";
      case "processing": return "processing";
      case "paid": return "paid";
      default: return "failed";
    }
  }
}
