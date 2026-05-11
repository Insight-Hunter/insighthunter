export interface Env {
    // Cloudflare bindings
    AI: Ai
    VECTORS: VectorizeIndex
    SESSIONS: KVNamespace
    DB: D1Database
    AI_SESSION: DurableObjectNamespace
    ANALYTICS: AnalyticsEngineDataset
  
    // Vars
    ENVIRONMENT: string
    ALLOWED_ORIGINS: string
    CHAT_MODEL: string
    EMBED_MODEL: string
    SUMMARY_MODEL: string
    MAX_TOKENS: string
    HISTORY_LIMIT: string
    FREE_CHAT_LIMIT: string
    PRO_CHAT_LIMIT: string
    JWT_SECRET: string
  }
  
  export interface SessionData {
    userId: string
    businessId: string
    email: string
    plan: 'free' | 'starter' | 'pro' | 'enterprise'
  }
  
  export interface ChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
  }
  
  export interface ChatRequest {
    question: string
    context?: FinancialContext
    stream?: boolean
  }
  
  export interface FinancialContext {
    revenue?: number
    expenses?: number
    netIncome?: number
    cashBalance?: number
    accountsReceivable?: number
    accountsPayable?: number
    period?: string
    topCategories?: { category: string; amount: number }[]
    recentTransactions?: { description: string; amount: number; type: string }[]
  }
  
  export interface InsightRequest {
    financials: FinancialContext
    type?: 'summary' | 'risks' | 'opportunities' | 'forecast' | 'full'
  }
  
  export interface ForecastRequest {
    months?: number                                   // 1–12, default 3
    historicalMonths?: number                         // lookback, default 6
  }
  
  export interface EmbedRequest {
    text: string | string[]
    namespace?: string
    metadata?: Record<string, string>
  }
  
  export interface SearchRequest {
    query: string
    topK?: number
    namespace?: string
    filter?: VectorizeVectorMetadataFilter
  }
  
  export interface AIUsageRecord {
    userId: string
    businessId: string
    action: string
    model: string
    tokens?: number
    ts: number
  }
  
