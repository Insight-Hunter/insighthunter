// src/backend/durable-objects/BankConnectionManager.ts
import { DurableObject } from 'cloudflare:workers';
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import { BankConnection, BankTransaction, PlaidLinkToken } from '@/types';
import type { Env } from '../index';

export class BankConnectionManager extends DurableObject<Env> {
  private plaidClient: PlaidApi;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    
    const configuration = new Configuration({
      basePath: PlaidEnvironments[env.PLAID_ENV || 'sandbox'],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': env.PLAID_CLIENT_ID,
          'PLAID-SECRET': env.PLAID_SECRET,
        },
      },
    });

    this.plaidClient = new PlaidApi(configuration);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.includes('/create-link-token') && request.method === 'POST') {
      return this.createLinkToken(request);
    }

    if (path.includes('/exchange-token') && request.method === 'POST') {
      return this.exchangePublicToken(request);
    }

    if (path.includes('/accounts') && request.method === 'GET') {
      return this.getAccounts(request);
    }

    if (path.includes('/sync') && request.method === 'POST') {
      return this.syncTransactions(request);
    }

    if (path.includes('/disconnect') && request.method === 'POST') {
      return this.disconnectAccount(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  private async createLinkToken(request: Request): Promise<Response> {
    try {
      const { userId, companyId } = await request.json();

      const response = await this.plaidClient.linkTokenCreate({
        user: {
          client_user_id: userId,
        },
        client_name: 'InsightHunter Bookkeeping',
        products: [Products.Transactions],
        country_codes: [CountryCode.Us],
        language: 'en',
      });

      const linkToken: PlaidLinkToken = {
        linkToken: response.data.link_token,
        expiration: response.data.expiration,
      };

      return Response.json(linkToken);
    } catch (error) {
      console.error('Link token creation error:', error);
      return Response.json(
        { error: 'Failed to create link token' },
        { status: 500 }
      );
    }
  }

  private async exchangePublicToken(request: Request): Promise<Response> {
    try {
      const { userId, companyId, publicToken, metadata } = await request.json();

      // Exchange public token for access token
      const tokenResponse = await this.plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });

      const accessToken = tokenResponse.data.access_token;
      const itemId = tokenResponse.data.item_id;

      // Get account details
      const accountsResponse = await this.plaidClient.accountsGet({
        access_token: accessToken,
      });

      // Get institution details
      const institutionId = metadata.institution?.institution_id;
      const institutionResponse = await this.plaidClient.institutionsGetById({
        institution_id: institutionId,
        country_codes: [CountryCode.Us],
      });

      // Store bank connections
      const connections: BankConnection[] = [];

      for (const account of accountsResponse.data.accounts) {
        const connection: BankConnection = {
          id: crypto.randomUUID(),
          userId,
          companyId,
          institutionId,
          institutionName: institutionResponse.data.institution.name,
          accountId: account.account_id,
          accountName: account.name,
          accountType: account.type as BankConnection['accountType'],
          accountMask: account.mask || '',
          balance: account.balances.current || 0,
          currency: account.balances.iso_currency_code || 'USD',
          plaidItemId: itemId,
          plaidAccessToken: accessToken,
          status: 'active',
          lastSync: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await this.ctx.storage.put(`bank:${connection.id}`, connection);
        connections.push(connection);
      }

      return Response.json({ success: true, connections });
    } catch (error) {
      console.error('Token exchange error:', error);
      return Response.json(
        { error: 'Failed to exchange token' },
        { status: 500 }
      );
    }
  }

  private async getAccounts(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userId = url.pathname.split('/')[3];

    const accounts = await this.ctx.storage.list<BankConnection>({
      prefix: 'bank:',
    });

    const userAccounts = Array.from(accounts.values()).filter(
      (acc) => acc.userId === userId
    );

    return Response.json({ accounts: userAccounts });
  }

  private async syncTransactions(request: Request): Promise<Response> {
    try {
      const { accountId } = await request.json();

      const connection = await this.ctx.storage.get<BankConnection>(
        `bank:${accountId}`
      );

      if (!connection) {
        return Response.json({ error: 'Account not found' }, { status: 404 });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      const endDate = new Date();

      const response = await this.plaidClient.transactionsGet({
        access_token: connection.plaidAccessToken,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });

      const transactions: BankTransaction[] = [];

      for (const tx of response.data.transactions) {
        const bankTransaction: BankTransaction = {
          id: crypto.randomUUID(),
          bankConnectionId: connection.id,
          transactionId: tx.transaction_id,
          date: tx.date,
          name: tx.name,
          merchantName: tx.merchant_name || undefined,
          amount: tx.amount,
          category: tx.category || [],
          pending: tx.pending,
          matched: false,
          createdAt: new Date().toISOString(),
        };

        await this.ctx.storage.put(`banktx:${bankTransaction.id}`, bankTransaction);
        transactions.push(bankTransaction);
      }

      connection.lastSync = new Date().toISOString();
      connection.updatedAt = new Date().toISOString();
      await this.ctx.storage.put(`bank:${accountId}`, connection);

      return Response.json({ success: true, transactions, count: transactions.length });
    } catch (error) {
      console.error('Transaction sync error:', error);
      return Response.json(
        { error: 'Failed to sync transactions' },
        { status: 500 }
      );
    }
  }

  private async disconnectAccount(request: Request): Promise<Response> {
    try {
      const { accountId } = await request.json();

      const connection = await this.ctx.storage.get<BankConnection>(
        `bank:${accountId}`
      );

      if (!connection) {
        return Response.json({ error: 'Account not found' }, { status: 404 });
      }

      // Remove item from Plaid
      await this.plaidClient.itemRemove({
        access_token: connection.plaidAccessToken,
      });

      connection.status = 'disconnected';
      connection.updatedAt = new Date().toISOString();

      await this.ctx.storage.put(`bank:${accountId}`, connection);

      return Response.json({ success: true });
    } catch (error) {
      console.error('Disconnect error:', error);
      return Response.json(
        { error: 'Failed to disconnect account' },
        { status: 500 }
      );
    }
  }
}
