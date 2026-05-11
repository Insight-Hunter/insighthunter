import type { QBOConnection, QBOTokenResponse, ProfitLoss, CashSummary } from "@/types";

const QBO_BASE = {
  sandbox:    "https://sandbox-quickbooks.api.intuit.com",
  production: "https://quickbooks.api.intuit.com",
} as const;

export class QBOClient {
  private baseUrl: string;

  constructor(
    private conn: QBOConnection,
    env: "sandbox" | "production" = "sandbox"
  ) {
    this.baseUrl = QBO_BASE[env];
  }

  private async fetch<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}/v3/company/${this.conn.realmId}${path}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.conn.accessToken}`,
        Accept:        "application/json",
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`QBO API error ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  async getProfitAndLoss(
    startDate: string,
    endDate:   string
  ): Promise<ProfitLoss> {
    const data = await this.fetch<any>(
      `/reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}&minorversion=73`
    );

    const rows: ProfitLoss["rows"] = [];
    let totalRevenue  = 0;
    let totalExpenses = 0;

    for (const section of data?.Rows?.Row ?? []) {
      const type: "income" | "expense" =
        section.group === "Income" ? "income" : "expense";
      for (const row of section?.Rows?.Row ?? []) {
        const amount = parseFloat(row?.Summary?.ColData?.[1]?.value ?? "0");
        rows.push({ account: row?.Summary?.ColData?.[0]?.value ?? "", amount, type });
        if (type === "income")  totalRevenue  += amount;
        if (type === "expense") totalExpenses += amount;
      }
    }

    return {
      periodStart:   startDate,
      periodEnd:     endDate,
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      rows,
    };
  }

  async getCashSummary(): Promise<CashSummary> {
    const data = await this.fetch<any>(
      "/reports/BalanceSheet?minorversion=73"
    );
    const cashRow = data?.Rows?.Row?.find(
      (r: any) => r?.Summary?.ColData?.[0]?.value === "Total Current Assets"
    );
    const balance = parseFloat(cashRow?.Summary?.ColData?.[1]?.value ?? "0");
    return { balance, inflow: 0, outflow: 0, asOf: new Date().toISOString() };
  }
}

export async function refreshQBOToken(
  conn: QBOConnection,
  clientId: string,
  clientSecret: string
): Promise<QBOTokenResponse> {
  const creds = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      Authorization:  `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: conn.refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`QBO token refresh failed: ${res.status}`);
  return res.json() as Promise<QBOTokenResponse>;
}
