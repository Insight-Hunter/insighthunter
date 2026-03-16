// src/backend/enhanced-ledger.ts
import { DurableObject } from "cloudflare:workers";
import { QuickBooksAPI } from "./integrations/quickbooks";

export interface Env {
  ENHANCED_LEDGER: DurableObjectNamespace;
  QUICKBOOKS_CLIENT_ID: string;
  QUICKBOOKS_CLIENT_SECRET: string;
  QUICKBOOKS_REDIRECT_URI: string;
  QUICKBOOKS_ENVIRONMENT: 'sandbox' | 'production';
}

// Puzzle.io inspired features
interface MetricsSnapshot {
  date: string;
  revenue: number;
  expenses: number;
  cashBalance: number;
  burnRate: number;
  runway: number; // months
  arr: number; // Annual Recurring Revenue
  mrr: number; // Monthly Recurring Revenue
}

interface BudgetItem {
  id: string;
  category: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  period: string;
}

interface Forecast {
  date: string;
  type: 'revenue' | 'expense' | 'cash';
  amount: number;
  confidence: number; // 0-1
  scenario: 'conservative' | 'realistic' | 'optimistic';
}

interface Tag {
  id: string;
  name: string;
  color: string;
  category: 'department' | 'project' | 'customer' | 'custom';
}

interface AutomationRule {
  id: string;
  name: string;
  trigger: 'transaction_created' | 'amount_threshold' | 'date_based';
  conditions: any[];
  actions: any[];
  enabled: boolean;
}

export class EnhancedLedger extends DurableObject<Env> {
  private qbApi: QuickBooksAPI;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    
    this.qbApi = new QuickBooksAPI({
      clientId: env.QUICKBOOKS_CLIENT_ID,
      clientSecret: env.QUICKBOOKS_CLIENT_SECRET,
      redirectUri: env.QUICKBOOKS_REDIRECT_URI,
      environment: env.QUICKBOOKS_ENVIRONMENT,
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // QuickBooks OAuth
    if (path.includes('/quickbooks/auth')) {
      return this.initiateQuickBooksAuth();
    }

    if (path.includes('/quickbooks/callback')) {
      return this.handleQuickBooksCallback(request);
    }

    // QuickBooks Sync
    if (path.includes('/quickbooks/sync')) {
      return this.syncWithQuickBooks(request);
    }

    if (path.includes('/quickbooks/import')) {
      return this.importFromQuickBooks(request);
    }

    if (path.includes('/quickbooks/export')) {
      return this.exportToQuickBooks(request);
    }

    // Puzzle.io inspired features
    if (path.includes('/metrics/snapshot')) {
      return this.getMetricsSnapshot(request);
    }

    if (path.includes('/metrics/trends')) {
      return this.getMetricsTrends(request);
    }

    if (path.includes('/budget')) {
      if (request.method === 'POST') {
        return this.createBudget(request);
      }
      return this.getBudgetAnalysis(request);
    }

    if (path.includes('/forecast')) {
      return this.generateForecast(request);
    }

    if (path.includes('/tags')) {
      if (request.method === 'POST') {
        return this.createTag(request);
      }
      return this.getTags();
    }

    if (path.includes('/automation')) {
      if (request.method === 'POST') {
        return this.createAutomationRule(request);
      }
      return this.getAutomationRules();
    }

    if (path.includes('/insights')) {
      return this.getAIInsights(request);
    }

    if (path.includes('/closing')) {
      return this.performMonthEndClosing(request);
    }

    if (path.includes('/audit-trail')) {
      return this.getAuditTrail(request);
    }

    if (path.includes('/scenarios')) {
      return this.runScenarioAnalysis(request);
    }

    if (path.includes('/cash-flow/forecast')) {
      return this.forecastCashFlow(request);
    }

    if (path.includes('/vendors/analysis')) {
      return this.analyzeVendorSpending(request);
    }

    if (path.includes('/revenue/recognition')) {
      return this.recognizeRevenue(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  // QuickBooks OAuth Flow
  private async initiateQuickBooksAuth(): Promise<Response> {
    const state = crypto.randomUUID();
    await this.ctx.storage.put('qb_oauth_state', state);

    const authUrl = this.qbApi.getAuthorizationUrl(state);

    return Response.json({ authUrl });
  }

  private async handleQuickBooksCallback(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const realmId = url.searchParams.get('realmId');

    if (!code || !state || !realmId) {
      return Response.json({ error: 'Invalid callback' }, { status: 400 });
    }

    const storedState = await this.ctx.storage.get('qb_oauth_state');
    if (state !== storedState) {
      return Response.json({ error: 'Invalid state' }, { status: 400 });
    }

    try {
      const tokens = await this.qbApi.exchangeCodeForToken(code);

      await this.ctx.storage.put('qb_access_token', tokens.accessToken);
      await this.ctx.storage.put('qb_refresh_token', tokens.refreshToken);
      await this.ctx.storage.put('qb_realm_id', realmId);
      await this.ctx.storage.put('qb_token_expires_at', tokens.expiresAt);

      return Response.json({ success: true, realmId });
    } catch (error) {
      return Response.json(
        { error: 'Failed to exchange code for token' },
        { status: 500 }
      );
    }
  }

  // QuickBooks Sync
  private async syncWithQuickBooks(request: Request): Promise<Response> {
    const accessToken = await this.getValidAccessToken();
    const realmId = await this.ctx.storage.get<string>('qb_realm_id');

    if (!accessToken || !realmId) {
      return Response.json(
        { error: 'QuickBooks not connected' },
        { status: 401 }
      );
    }

    try {
      // Sync accounts
      const accounts = await this.qbApi.getAccounts(accessToken, realmId);
      await this.syncAccounts(accounts.QueryResponse?.Account || []);

      // Sync customers
      const customers = await this.qbApi.getCustomers(accessToken, realmId);
      await this.syncCustomers(customers.QueryResponse?.Customer || []);

      // Sync vendors
      const vendors = await this.qbApi.getVendors(accessToken, realmId);
      await this.syncVendors(vendors.QueryResponse?.Vendor || []);

      // Sync invoices
      const invoices = await this.qbApi.getInvoices(accessToken, realmId);
      await this.syncInvoices(invoices.QueryResponse?.Invoice || []);

      return Response.json({ success: true, synced: new Date().toISOString() });
    } catch (error) {
      return Response.json(
        { error: 'Sync failed' },
        { status: 500 }
      );
    }
  }

  private async importFromQuickBooks(request: Request): Promise<Response> {
    const { entityType, startDate, endDate } = await request.json();
    
    const accessToken = await this.getValidAccessToken();
    const realmId = await this.ctx.storage.get<string>('qb_realm_id');

    if (!accessToken || !realmId) {
      return Response.json(
        { error: 'QuickBooks not connected' },
        { status: 401 }
      );
    }

    try {
      let data;
      
      switch (entityType) {
        case 'profit-loss':
          data = await this.qbApi.getProfitAndLoss(accessToken, realmId, startDate, endDate);
          break;
        case 'balance-sheet':
          data = await this.qbApi.getBalanceSheet(accessToken, realmId, endDate);
          break;
        case 'cash-flow':
          data = await this.qbApi.getCashFlow(accessToken, realmId, startDate, endDate);
          break;
        default:
          return Response.json({ error: 'Invalid entity type' }, { status: 400 });
      }

      return Response.json({ success: true, data });
    } catch (error) {
      return Response.json({ error: 'Import failed' }, { status: 500 });
    }
  }

  private async exportToQuickBooks(request: Request): Promise<Response> {
    const { entityType, data } = await request.json();
    
    const accessToken = await this.getValidAccessToken();
    const realmId = await this.ctx.storage.get<string>('qb_realm_id');

    if (!accessToken || !realmId) {
      return Response.json(
        { error: 'QuickBooks not connected' },
        { status: 401 }
      );
    }

    try {
      let result;
      
      switch (entityType) {
        case 'invoice':
          result = await this.qbApi.createInvoice(accessToken, realmId, data);
          break;
        case 'bill':
          result = await this.qbApi.createBill(accessToken, realmId, data);
          break;
        case 'journal-entry':
          result = await this.qbApi.createJournalEntry(accessToken, realmId, data);
          break;
        default:
          return Response.json({ error: 'Invalid entity type' }, { status: 400 });
      }

      return Response.json({ success: true, result });
    } catch (error) {
      return Response.json({ error: 'Export failed' }, { status: 500 });
    }
  }

  // Puzzle.io Features: Metrics & Analytics
  private async getMetricsSnapshot(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

    const snapshot = await this.calculateMetricsSnapshot(date);

    return Response.json(snapshot);
  }

  private async calculateMetricsSnapshot(date: string): Promise<MetricsSnapshot> {
    // Calculate all key metrics for the specified date
    const profitLoss = await this.getProfitLossForDate(date);
    const balanceSheet = await this.getBalanceSheetForDate(date);

    const cashBalance = balanceSheet.assets.currentAssets
      .filter(a => a.name.toLowerCase().includes('cash'))
      .reduce((sum, a) => sum + a.amount, 0);

    const monthlyExpenses = profitLoss.totalExpenses;
    const burnRate = monthlyExpenses;
    const runway = cashBalance > 0 ? cashBalance / burnRate : 0;

    // Calculate ARR and MRR
    const recurringRevenue = await this.calculateRecurringRevenue(date);

    return {
      date,
      revenue: profitLoss.totalRevenue,
      expenses: profitLoss.totalExpenses,
      cashBalance,
      burnRate,
      runway,
      arr: recurringRevenue.arr,
      mrr: recurringRevenue.mrr,
    };
  }

  private async getMetricsTrends(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const months = parseInt(url.searchParams.get('months') || '12');

    const trends = [];
    const today = new Date();

    for (let i = 0; i < months; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const dateStr = date.toISOString().split('T')[0];
      
      const snapshot = await this.calculateMetricsSnapshot(dateStr);
      trends.unshift(snapshot);
    }

    return Response.json({ trends });
  }

  // Budget Management
  private async createBudget(request: Request): Promise<Response> {
    const budget = await request.json();
    const budgetId = crypto.randomUUID();

    await this.ctx.storage.put(`budget:${budgetId}`, {
      ...budget,
      id: budgetId,
      createdAt: new Date().toISOString(),
    });

    return Response.json({ success: true, budgetId });
  }

  private async getBudgetAnalysis(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'current-month';

    const budgets = await this.ctx.storage.list<BudgetItem>({ prefix: 'budget:' });
    const actual = await this.getActualSpending(period);

    const analysis = Array.from(budgets.values()).map(budget => ({
      ...budget,
      actualAmount: actual[budget.category] || 0,
      variance: (actual[budget.category] || 0) - budget.budgetedAmount,
      percentUsed: ((actual[budget.category] || 0) / budget.budgetedAmount) * 100,
    }));

    return Response.json({ analysis });
  }

  // Forecasting
  private async generateForecast(request: Request): Promise<Response> {
    const { type, months } = await request.json();

    const historical = await this.getHistoricalData(type, 12);
    const forecast = this.calculateForecast(historical, months);

    return Response.json({ forecast });
  }

  private calculateForecast(historical: number[], months: number): Forecast[] {
    // Simple linear regression for forecasting
    const forecasts: Forecast[] = [];

    // Calculate trend
    const n = historical.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = historical.reduce((a, b) => a + b, 0);
    const sumXY = historical.reduce((sum, y, i) => sum + (i + 1) * y, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate forecasts
    for (let i = 1; i <= months; i++) {
      const x = n + i;
      const realistic = slope * x + intercept;
      
      forecasts.push({
        date: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type: 'revenue',
        amount: realistic,
        confidence: Math.max(0.5, 1 - (i / months) * 0.5),
        scenario: 'realistic',
      });

      forecasts.push({
        date: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type: 'revenue',
        amount: realistic * 1.2,
        confidence: Math.max(0.3, 1 - (i / months) * 0.7),
        scenario: 'optimistic',
      });

      forecasts.push({
        date: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type: 'revenue',
        amount: realistic * 0.8,
        confidence: Math.max(0.7, 1 - (i / months) * 0.3),
        scenario: 'conservative',
      });
    }

    return forecasts;
  }

  // Tags & Categorization
  private async createTag(request: Request): Promise<Response> {
    const tag: Tag = await request.json();
    tag.id = crypto.randomUUID();

    await this.ctx.storage.put(`tag:${tag.id}`, tag);

    return Response.json({ success: true, tag });
  }

  private async getTags(): Promise<Response> {
    const tags = await this.ctx.storage.list<Tag>({ prefix: 'tag:' });
    return Response.json({ tags: Array.from(tags.values()) });
  }

  // Automation Rules
  private async createAutomationRule(request: Request): Promise<Response> {
    const rule: AutomationRule = await request.json();
    rule.id = crypto.randomUUID();

    await this.ctx.storage.put(`automation:${rule.id}`, rule);

    return Response.json({ success: true, rule });
  }

  private async getAutomationRules(): Promise<Response> {
    const rules = await this.ctx.storage.list<AutomationRule>({ prefix: 'automation:' });
    return Response.json({ rules: Array.from(rules.values()) });
  }

  private async executeAutomationRules(transaction: any) {
    const rules = await this.ctx.storage.list<AutomationRule>({ prefix: 'automation:' });

    for (const rule of rules.values()) {
      if (!rule.enabled) continue;

      const shouldExecute = this.evaluateRuleConditions(rule, transaction);
      
      if (shouldExecute) {
        await this.executeRuleActions(rule, transaction);
      }
    }
  }

  private evaluateRuleConditions(rule: AutomationRule, transaction: any): boolean {
    // Evaluate if all conditions are met
    return rule.conditions.every(condition => {
      switch (condition.type) {
        case 'amount_greater_than':
          return transaction.amount > condition.value;
        case 'amount_less_than':
          return transaction.amount < condition.value;
        case 'account_equals':
          return transaction.accountId === condition.value;
        case 'description_contains':
          return transaction.description.toLowerCase().includes(condition.value.toLowerCase());
        default:
          return false;
      }
    });
  }

  private async executeRuleActions(rule: AutomationRule, transaction: any) {
    for (const action of rule.actions) {
      switch (action.type) {
        case 'add_tag':
          await this.addTagToTransaction(transaction.id, action.tagId);
          break;
        case 'categorize':
          await this.categorizeTransaction(transaction.id, action.category);
          break;
        case 'send_notification':
          await this.sendNotification(action.message, transaction);
          break;
        case 'create_task':
          await this.createTask(action.taskData, transaction);
          break;
      }
    }
  }

  // AI Insights (Puzzle.io inspired)
  private async getAIInsights(request: Request): Promise<Response> {
    const insights = [];

    // Cash flow insights
    const cashFlowInsight = await this.analyzeCashFlow();
    if (cashFlowInsight) insights.push(cashFlowInsight);

    // Spending patterns
    const spendingInsight = await this.analyzeSpendingPatterns();
    if (spendingInsight) insights.push(spendingInsight);

    // Revenue trends
    const revenueInsight = await this.analyzeRevenueTrends();
    if (revenueInsight) insights.push(revenueInsight);

    // Anomalies
    const anomalies = await this.detectAnomalies();
    insights.push(...anomalies);

    return Response.json({ insights });
  }

  private async analyzeCashFlow() {
    const snapshot = await this.calculateMetricsSnapshot(
      new Date().toISOString().split('T')[0]
    );

    if (snapshot.runway < 3) {
      return {
        type: 'warning',
        category: 'cash-flow',
        title: 'Low Cash Runway',
        message: `Your current cash runway is ${snapshot.runway.toFixed(1)} months. Consider reducing expenses or increasing revenue.`,
        priority: 'high',
        actionable: true,
      };
    }

    return null;
  }

  private async analyzeSpendingPatterns() {
    const thisMonth = await this.getActualSpending('current-month');
    const lastMonth = await this.getActualSpending('last-month');

    const categories = Object.keys(thisMonth);
    const increases = categories.filter(cat => {
      const increase = ((thisMonth[cat] - lastMonth[cat]) / lastMonth[cat]) * 100;
      return increase > 20;
    });

    if (increases.length > 0) {
      return {
        type: 'info',
        category: 'spending',
        title: 'Spending Increase Detected',
        message: `Spending increased by >20% in: ${increases.join(', ')}`,
        priority: 'medium',
        actionable: true,
      };
    }

    return null;
  }

  private async analyzeRevenueTrends() {
    const historical = await this.getHistoricalData('revenue', 6);
    
    // Check for declining trend
    const recentAvg = historical.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const olderAvg = historical.slice(0, 3).reduce((a, b) => a + b, 0) / 3;

    if (recentAvg < olderAvg * 0.9) {
      return {
        type: 'warning',
        category: 'revenue',
        title: 'Revenue Declining',
        message: 'Revenue has declined by >10% over the last 3 months',
        priority: 'high',
        actionable: true,
      };
    }

    return null;
  }

  private async detectAnomalies() {
    const anomalies = [];

    // Detect unusual transactions
    const recentTransactions = await this.ctx.storage.list({ prefix: 'tx:' });
    const amounts = Array.from(recentTransactions.values())
      .map((tx: any) => tx.entries.reduce((sum: number, e: any) => sum + e.amount, 0));

    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / amounts.length
    );

    const threshold = mean + 3 * stdDev;
    const unusualTransactions = Array.from(recentTransactions.values())
      .filter((tx: any) => {
        const amount = tx.entries.reduce((sum: number, e: any) => sum + e.amount, 0);
        return amount > threshold;
      });

    if (unusualTransactions.length > 0) {
      anomalies.push({
        type: 'alert',
        category: 'anomaly',
        title: 'Unusual Transactions Detected',
        message: `${unusualTransactions.length} transaction(s) exceed normal patterns`,
        priority: 'medium',
        actionable: true,
      });
    }

    return anomalies;
  }

  // Month-End Closing
  private async performMonthEndClosing(request: Request): Promise<Response> {
    const { period } = await request.json();

    const closingSteps = [
      { name: 'Reconcile Bank Accounts', status: 'pending' },
      { name: 'Review Undeposited Funds', status: 'pending' },
      { name: 'Verify Accounts Receivable', status: 'pending' },
      { name: 'Verify Accounts Payable', status: 'pending' },
      { name: 'Accrue Expenses', status: 'pending' },
      { name: 'Defer Revenue', status: 'pending' },
      { name: 'Calculate Depreciation', status: 'pending' },
      { name: 'Review Journal Entries', status: 'pending' },
      { name: 'Generate Financial Statements', status: 'pending' },
      { name: 'Lock Period', status: 'pending' },
    ];

    // Execute closing steps
    for (const step of closingSteps) {
      try {
        await this.executeClosingStep(step.name, period);
        step.status = 'completed';
      } catch (error) {
        step.status = 'failed';
      }
    }

    // Mark period as closed
    await this.ctx.storage.put(`closed:${period}`, {
      period,
      closedAt: new Date().toISOString(),
      steps: closingSteps,
    });

    return Response.json({ success: true, steps: closingSteps });
  }

  private async executeClosingStep(stepName: string, period: string) {
    // Implement each closing step
    switch (stepName) {
      case 'Calculate Depreciation':
        await this.calculateAndRecordDepreciation(period);
        break;
      case 'Lock Period':
        await this.lockAccountingPeriod(period);
        break;
      // Add more step implementations
    }
  }

  // Audit Trail
  private async getAuditTrail(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const userId = url.searchParams.get('userId');

    const auditEntries = await this.ctx.storage.list({ prefix: 'audit:' });
    
    let filtered = Array.from(auditEntries.values());

    if (startDate) {
      filtered = filtered.filter(
        (entry: any) => entry.timestamp >= startDate
      );
    }

    if (endDate) {
      filtered = filtered.filter(
        (entry: any) => entry.timestamp <= endDate
      );
    }

    if (userId) {
      filtered = filtered.filter(
        (entry: any) => entry.userId === userId
      );
    }

    return Response.json({ auditTrail: filtered });
  }

  private async logAuditEntry(action: string, details: any, userId: string) {
    const entry = {
      id: crypto.randomUUID(),
      action,
      details,
      userId,
      timestamp: new Date().toISOString(),
      ipAddress: details.ipAddress,
    };

    await this.ctx.storage.put(`audit:${entry.id}`, entry);
  }

  // Scenario Analysis
  private async runScenarioAnalysis(request: Request): Promise<Response> {
    const { scenarios } = await request.json();

    const results = [];

    for (const scenario of scenarios) {
      const result = await this.analyzeScenario(scenario);
      results.push(result);
    }

    return Response.json({ scenarios: results });
  }

  private async analyzeScenario(scenario: any) {
    const baseMetrics = await this.calculateMetricsSnapshot(
      new Date().toISOString().split('T')[0]
    );

    // Apply scenario changes
    const projectedRevenue = baseMetrics.revenue * (1 + scenario.revenueChange / 100);
    const projectedExpenses = baseMetrics.expenses * (1 + scenario.expenseChange / 100);
    const projectedCash = baseMetrics.cashBalance + (projectedRevenue - projectedExpenses);

    return {
      name: scenario.name,
      projectedRevenue,
      projectedExpenses,
      projectedCash,
      projectedRunway: projectedCash / baseMetrics.burnRate,
      impact: projectedCash - baseMetrics.cashBalance,
    };
  }

  // Cash Flow Forecasting
  private async forecastCashFlow(request: Request): Promise<Response> {
    const { months } = await request.json();

    const forecast = [];
    const today = new Date();

    for (let i = 0; i < months; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      
      const projected = await this.projectCashFlowForMonth(date);
      forecast.push(projected);
    }

    return Response.json({ forecast });
  }

  private async projectCashFlowForMonth(date: Date) {
    // Project based on historical patterns and known future transactions
    const historical = await this.getHistoricalData('cash', 6);
    const average = historical.reduce((a, b) => a + b, 0) / historical.length;

    return {
      date: date.toISOString().split('T')[0],
      projectedInflows: average * 1.05, // Simple projection
      projectedOutflows: average * 0.95,
      netCashFlow: average * 0.1,
    };
  }

  // Vendor Analysis
  private async analyzeVendorSpending(request: Request): Promise<Response> {
    const transactions = await this.ctx.storage.list({ prefix: 'tx:' });
    
    const vendorSpending: Record<string, number> = {};

    for (const tx of transactions.values()) {
      const txData = tx as any;
      
      // Find vendor/payee from transaction
      const vendor = txData.vendor || txData.payee;
      
      if (vendor) {
        const amount = txData.entries
          .filter((e: any) => e.type === 'debit')
          .reduce((sum: number, e: any) => sum + e.amount, 0);
        
        vendorSpending[vendor] = (vendorSpending[vendor] || 0) + amount;
      }
    }

    const sorted = Object.entries(vendorSpending)
      .map(([vendor, amount]) => ({ vendor, amount }))
      .sort((a, b) => b.amount - a.amount);

    return Response.json({ vendorAnalysis: sorted });
  }

  // Revenue Recognition
  private async recognizeRevenue(request: Request): Promise<Response> {
    const { contractId, recognitionMethod } = await request.json();

    // Implement revenue recognition based on ASC 606
    const contract = await this.ctx.storage.get(`contract:${contractId}`);
    
    if (!contract) {
      return Response.json({ error: 'Contract not found' }, { status: 404 });
    }

    let recognizedRevenue;

    switch (recognitionMethod) {
      case 'point-in-time':
        recognizedRevenue = await this.recognizeRevenuePointInTime(contract);
        break;
      case 'over-time':
        recognizedRevenue = await this.recognizeRevenueOverTime(contract);
        break;
      default:
        return Response.json({ error: 'Invalid method' }, { status: 400 });
    }

    return Response.json({ recognizedRevenue });
  }

  // Helper methods
  private async getValidAccessToken(): Promise<string | null> {
    const accessToken = await this.ctx.storage.get<string>('qb_access_token');
    const expiresAt = await this.ctx.storage.get<number>('qb_token_expires_at');

    if (!accessToken || !expiresAt) {
      return null;
    }

    // Check if token is expired
    if (Date.now() >= expiresAt) {
      const refreshToken = await this.ctx.storage.get<string>('qb_refresh_token');
      
      if (!refreshToken) {
        return null;
      }

      try {
        const newTokens = await this.qbApi.refreshAccessToken(refreshToken);
        
        await this.ctx.storage.put('qb_access_token', newTokens.accessToken);
        await this.ctx.storage.put('qb_refresh_token', newTokens.refreshToken);
        await this.ctx.storage.put('qb_token_expires_at', newTokens.expiresAt);

        return newTokens.accessToken;
      } catch (error) {
        return null;
      }
    }

    return accessToken;
  }

  private async syncAccounts(qbAccounts: any[]) {
    for (const qbAccount of qbAccounts) {
      await this.ctx.storage.put(`account:${qbAccount.Id}`, {
        id: qbAccount.Id,
        name: qbAccount.Name,
        type: this.mapQBAccountType(qbAccount.AccountType),
        subtype: qbAccount.AccountSubType,
        description: qbAccount.Description,
        balance: qbAccount.CurrentBalance,
        source: 'quickbooks',
      });
    }
  }

  private async syncCustomers(qbCustomers: any[]) {
    for (const qbCustomer of qbCustomers) {
      await this.ctx.storage.put(`client:${qbCustomer.Id}`, {
        id: qbCustomer.Id,
        name: qbCustomer.DisplayName,
        email: qbCustomer.PrimaryEmailAddr?.Address,
        phone: qbCustomer.PrimaryPhone?.FreeFormNumber,
        address: qbCustomer.BillAddr?.Line1,
        source: 'quickbooks',
      });
    }
  }

  private async syncVendors(qbVendors: any[]) {
    for (const qbVendor of qbVendors) {
      await this.ctx.storage.put(`vendor:${qbVendor.Id}`, {
        id: qbVendor.Id,
        name: qbVendor.DisplayName,
        email: qbVendor.PrimaryEmailAddr?.Address,
        phone: qbVendor.PrimaryPhone?.FreeFormNumber,
        address: qbVendor.BillAddr?.Line1,
        source: 'quickbooks',
      });
    }
  }

  private async syncInvoices(qbInvoices: any[]) {
    for (const qbInvoice of qbInvoices) {
      // Convert QB invoice to internal transaction format
      const transaction = {
        id: qbInvoice.Id,
        date: qbInvoice.TxnDate,
        description: `Invoice ${qbInvoice.DocNumber}`,
        entries: [
          {
            accountId: 'accounts-receivable',
            accountName: 'Accounts Receivable',
            type: 'debit' as const,
            amount: qbInvoice.TotalAmt,
          },
          {
            accountId: 'revenue',
            accountName: 'Revenue',
            type: 'credit' as const,
            amount: qbInvoice.TotalAmt,
          },
        ],
        source: 'quickbooks',
        sourceId: qbInvoice.Id,
      };

      await this.ctx.storage.put(`tx:${transaction.id}`, transaction);
    }
  }

  private mapQBAccountType(qbType: string): string {
    const mapping: Record<string, string> = {
      'Bank': 'asset',
      'Other Current Asset': 'asset',
      'Fixed Asset': 'asset',
      'Accounts Receivable': 'asset',
      'Accounts Payable': 'liability',
      'Credit Card': 'liability',
      'Other Current Liability': 'liability',
      'Long Term Liability': 'liability',
      'Equity': 'equity',
      'Income': 'revenue',
      'Cost of Goods Sold': 'cost-of-goods-sold',
      'Expense': 'expense',
    };

    return mapping[qbType] || 'asset';
  }

  private async getProfitLossForDate(date: string) {
    // Implementation to get P&L for a specific date
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0,
    };
  }

  private async getBalanceSheetForDate(date: string) {
    // Implementation to get balance sheet for a specific date
    return {
      assets: { currentAssets: [], total: 0 },
      liabilities: { total: 0 },
      equity: { total: 0 },
    };
  }

  private async calculateRecurringRevenue(date: string) {
    // Calculate MRR and ARR from subscription/recurring transactions
    return {
      mrr: 0,
      arr: 0,
    };
  }

  private async getActualSpending(period: string): Promise<Record<string, number>> {
    // Get actual spending by category for the period
    return {};
  }

  private async getHistoricalData(type: string, months: number): Promise<number[]> {
    // Get historical data for forecasting
    return new Array(months).fill(0);
  }

  private async addTagToTransaction(txId: string, tagId: string) {
    const tx = await this.ctx.storage.get(`tx:${txId}`);
    if (tx) {
      const updated = { ...tx, tags: [...(tx.tags || []), tagId] };
      await this.ctx.storage.put(`tx:${txId}`, updated);
    }
  }

  private async categorizeTransaction(txId: string, category: string) {
    const tx = await this.ctx.storage.get(`tx:${txId}`);
    if (tx) {
      const updated = { ...tx, category };
      await this.ctx.storage.put(`tx:${txId}`, updated);
    }
  }

  private async sendNotification(message: string, transaction: any) {
    // Send notification (email, Slack, etc.)
    console.log(`Notification: ${message}`, transaction);
  }

  private async createTask(taskData: any, transaction: any) {
    const task = {
      ...taskData,
      relatedTransaction: transaction.id,
      createdAt: new Date().toISOString(),
    };
    
    await this.ctx.storage.put(`task:${crypto.randomUUID()}`, task);
  }

  private async calculateAndRecordDepreciation(period: string) {
    // Calculate and record depreciation entries
  }

  private async lockAccountingPeriod(period: string) {
    await this.ctx.storage.put(`lock:${period}`, {
      locked: true,
      lockedAt: new Date().toISOString(),
    });
  }

  private async recognizeRevenuePointInTime(contract: any) {
    // Recognize revenue at point of delivery
    return {};
  }

  private async recognizeRevenueOverTime(contract: any) {
    // Recognize revenue over contract period
    return {};
  }
}
