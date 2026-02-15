// src/backend/integrations/quickbooks.ts
import { OAuth2Client } from '@badgateway/oauth2-client';

export interface QuickBooksConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: 'sandbox' | 'production';
}

export class QuickBooksAPI {
  private oauth2Client: OAuth2Client;
  private baseUrl: string;

  constructor(private config: QuickBooksConfig) {
    const authEndpoint = config.environment === 'sandbox'
      ? 'https://appcenter.intuit.com/connect/oauth2'
      : 'https://appcenter.intuit.com/connect/oauth2';

    const tokenEndpoint = config.environment === 'sandbox'
      ? 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
      : 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

    this.baseUrl = config.environment === 'sandbox'
      ? 'https://sandbox-quickbooks.api.intuit.com'
      : 'https://quickbooks.api.intuit.com';

    this.oauth2Client = new OAuth2Client({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authorizationEndpoint: authEndpoint,
      tokenEndpoint: tokenEndpoint,
    });
  }

  getAuthorizationUrl(state: string): string {
    return this.oauth2Client.authorizationCode.getAuthorizeUri({
      redirectUri: this.config.redirectUri,
      state,
      scope: [
        'com.intuit.quickbooks.accounting',
        'com.intuit.quickbooks.payment',
      ],
    });
  }

  async exchangeCodeForToken(code: string) {
    const token = await this.oauth2Client.authorizationCode.getTokenFromCodeRedirect(
      new URL(`${this.config.redirectUri}?code=${code}`),
      { redirectUri: this.config.redirectUri }
    );

    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
      realmId: token.realmId,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const token = await this.oauth2Client.refreshToken({
      refreshToken,
    });

    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
    };
  }

  // Company Info
  async getCompanyInfo(accessToken: string, realmId: string) {
    const response = await fetch(
      `${this.baseUrl}/v3/company/${realmId}/companyinfo/${realmId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Accounts
  async getAccounts(accessToken: string, realmId: string) {
    const response = await fetch(
      `${this.baseUrl}/v3/company/${realmId}/query?query=select * from Account`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.statusText}`);
    }

    return response.json();
  }

  async createAccount(accessToken: string, realmId: string, account: any) {
    const response = await fetch(
      `${this.baseUrl}/v3/company/${realmId}/account`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(account),
      }
    );

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Customers
  async getCustomers(accessToken: string, realmId: string) {
    const response = await fetch(
      `${this.baseUrl}/v3/company/${realmId}/query?query=select * from Customer`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.statusText}`);
    }

    return response.json();
  }

  async createCustomer(accessToken: string, realmId: string, customer: any) {
    const response = await fetch(
      `${this.baseUrl}/v3/company/${realmId}/customer`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(customer),
      }
    );

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Invoices
  async getInvoices(accessToken: string, realmId: string, startDate?: string, endDate?: string) {
    let query = 'select * from Invoice';
    if (startDate && endDate) {
      query += ` where TxnDate >= '${startDate}' and TxnDate <= '${endDate}'`;
    }

    const response = await fetch(
      `${this.baseUrl}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.statusText}`);
    }

    return response.json();
  }

  async createInvoice(accessToken: string, realmId: string, invoice: any) {
    const response = await fetch(
      `${this.baseUrl}/v3/company/${realmId}/invoice`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(invoice),
      }
    );

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Journal Entries
  async createJournalEntry(accessToken: string, realmId: string, journalEntry: any) {
    const response = await fetch(
      `${this.baseUrl}/v3/company/${realmId}/journalentry`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(journalEntry),
      }
    );

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Reports
  async getProfitAndLoss(
    accessToken: string,
    realmId: string,
    startDate: string,
    endDate: string
  ) {
    const response = await fetch(
      `${this.baseUrl}/v3/company/${realmId}/reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getBalanceSheet(accessToken: string, realmId: string, date: string) {
    const response = await fetch(
      `${this.baseUrl}/v3/company/${realmId}/reports/BalanceSheet?date=${date}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getCashFlow(
    accessToken: string,
    realmId: string,
    startDate: string,
    endDate: string
  ) {
    const response = await fetch(
      `${this.baseUrl}/v3/company/${realmId}/reports/CashFlow?start_date=${startDate}&end_date=${endDate}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Vendors
  async getVendors(accessToken: string, realmId: string) {
    const response = await fetch(
      `${this.baseUrl}/v3/company/${realmId}/query?query=select * from Vendor`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Bills
  async getBills(accessToken: string, realmId: string) {
    const response = await fetch(
      `${this.baseUrl}/v3/company/${realmId}/query?query=select * from Bill`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.statusText}`);
    }

    return response.json();
  }

  async createBill(accessToken: string, realmId: string, bill: any) {
    const response = await fetch(
      `${this.baseUrl}/v3/company/${realmId}/bill`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(bill),
      }
    );

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Payments
  async createPayment(accessToken: string, realmId: string, payment: any) {
    const response = await fetch(
      `${this.baseUrl}/v3/company/${realmId}/payment`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payment),
      }
    );

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Bank Accounts
  async getBankAccounts(accessToken: string, realmId: string) {
    const response = await fetch(
      `${this.baseUrl}/v3/company/${realmId}/query?query=select * from Account where AccountType='Bank'`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Webhooks
  async verifyWebhookSignature(
    payload: string,
    signature: string,
    webhookToken: string
  ): Promise<boolean> {
    const crypto = await import('crypto');
    const hmac = crypto.createHmac('sha256', webhookToken);
    hmac.update(payload);
    const hash = hmac.digest('base64');
    return hash === signature;
  }
}
