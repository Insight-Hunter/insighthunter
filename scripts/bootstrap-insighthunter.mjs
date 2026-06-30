#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const files = {
  'package.json': `{
  "name": "insighthunter",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "description": "InsightHunter - AI-powered Financial Operating System",
  "license": "MIT",
  "author": "InsightHunter",
  "type": "module",
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=10.0.0"
  },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "check": "turbo run check",
    "format": "biome format . --write",
    "clean": "turbo run clean && rimraf node_modules .turbo",
    "prepare": "husky install"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "@changesets/cli": "^2.29.5",
    "@types/node": "^24.0.0",
    "husky": "^9.1.7",
    "rimraf": "^6.0.1",
    "turbo": "^2.5.4",
    "typescript": "^5.8.3"
  }
}
`,
  'pnpm-workspace.yaml': `packages:
  - apps/*
  - packages/*
`,
  'turbo.json': `{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "check": {
      "dependsOn": ["build"]
    },
    "clean": {
      "cache": false
    }
  }
}
`,
  'tsconfig.base.json': `{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitOverride": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    "verbatimModuleSyntax": true,
    "declaration": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true
  }
}
`,
  'biome.json': `{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  },
  "json": {
    "formatter": {
      "enabled": true
    }
  }
}
`,
  '.gitignore': `node_modules
dist
coverage
.env
.env.local
.turbo
.DS_Store
.vscode/settings.json
`,
  '.editorconfig': `root = true

[*]
charset = utf-8
indent_style = space
indent_size = 2
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
`,
  '.env.example': `NODE_ENV=development
JWT_SECRET=
DATABASE_URL=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
D1_DATABASE_ID=
KV_NAMESPACE_ID=
R2_BUCKET=
VECTORIZE_INDEX=
WORKERS_AI_ACCOUNT=
`,
  'README.md': `# InsightHunter

AI-powered Financial Operating System for modern small businesses.

## Tech Stack

- Cloudflare Workers
- D1
- KV
- R2
- Vectorize
- Workers AI
- Astro
- Svelte
- TypeScript
- Turborepo

## Requirements

- Node.js 22+
- pnpm 10+

## Install

\`\`\`bash
pnpm install
\`\`\`

## Development

\`\`\`bash
pnpm dev
\`\`\`

## Build

\`\`\`bash
pnpm build
\`\`\`

## Test

\`\`\`bash
pnpm test
\`\`\`

## License

MIT
`,
  'packages/types/package.json': `{
  "name": "@ih/types",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "biome check src tests",
    "test": "vitest run",
    "clean": "rimraf dist"
  },
  "devDependencies": {
    "rimraf": "^6.0.1",
    "vitest": "^3.2.4"
  }
}
`,
  'packages/types/tsconfig.json': `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "composite": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "tests", "node_modules"]
}
`,
  'packages/types/README.md': `# @ih/types

Shared TypeScript types for InsightHunter services and applications.

## Scripts

- \`pnpm build\`
- \`pnpm lint\`
- \`pnpm test\`
- \`pnpm clean\`
`,
  'packages/types/src/common.ts': `export type UUID = string;
export type ISODate = string;
export type CurrencyCode = string;
export type Timestamp = string;
`,
  'packages/types/src/api.ts': `export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
`,
  'packages/types/src/auth.ts': `import type { ISODate, UUID } from './common.js';

export interface JwtPayload {
  sub: UUID;
  orgId: UUID;
  email: string;
  role: string;
  sessionId: UUID;
  iat: number;
  exp: number;
}

export interface Session {
  id: UUID;
  userId: UUID;
  createdAt: ISODate;
  expiresAt: ISODate;
  ipAddress: string;
  userAgent: string;
}
`,
  'packages/types/src/organization.ts': `import type { ISODate, UUID } from './common.js';

export interface Organization {
  id: UUID;
  name: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface User {
  id: UUID;
  organizationId: UUID;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
}
`,
  'packages/types/src/accounting.ts': `import type { CurrencyCode, UUID } from './common.js';

export enum AccountType {
  Asset = 'asset',
  Liability = 'liability',
  Equity = 'equity',
  Revenue = 'revenue',
  Expense = 'expense',
}

export interface Account {
  id: UUID;
  number: string;
  name: string;
  type: AccountType;
  active: boolean;
}

export interface MoneyAmount {
  amount: number;
  currency: CurrencyCode;
}
`,
  'packages/types/src/ai.ts': `import type { ISODate, UUID } from './common.js';

export interface AiConversation {
  id: UUID;
  organizationId: UUID;
  userId: UUID;
  title: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface AiMessage {
  id: UUID;
  conversationId: UUID;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  createdAt: ISODate;
}
`,
  'packages/types/src/audit.ts': `import type { ISODate, UUID } from './common.js';

export interface AuditEvent {
  id: UUID;
  actorId: UUID;
  organizationId: UUID;
  action: string;
  entity: string;
  entityId: UUID;
  createdAt: ISODate;
}
`,
  'packages/types/src/pagination.ts': `export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
`,
  'packages/types/src/index.ts': `export * from './accounting.js';
export * from './ai.js';
export * from './api.js';
export * from './audit.js';
export * from './auth.js';
export * from './common.js';
export * from './organization.js';
export * from './pagination.js';
`,
  'packages/types/tests/types.test.ts': `import { describe, expect, it } from 'vitest';
import { AccountType } from '../src/accounting.js';

describe('@ih/types', () => {
  it('exports accounting enums', () => {
    expect(AccountType.Asset).toBe('asset');
    expect(AccountType.Revenue).toBe('revenue');
  });
});
`,
  'packages/config/package.json': `{
  "name": "@ih/config",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "biome check src tests",
    "test": "vitest run",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "rimraf": "^6.0.1",
    "vitest": "^3.2.4"
  }
}
`,
  'packages/config/tsconfig.json': `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "composite": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "tests", "node_modules"]
}
`,
  'packages/config/README.md': `# @ih/config

Validated runtime configuration, feature flags, bindings, and application metadata for InsightHunter.

## Scripts

- \`pnpm build\`
- \`pnpm lint\`
- \`pnpm test\`
- \`pnpm clean\`
`,
  'packages/config/src/env.ts': `import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_SECRET: z.string().min(32),
  DATABASE_URL: z.string().min(1).optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
  CLOUDFLARE_API_TOKEN: z.string().min(1).optional(),
  D1_DATABASE_ID: z.string().min(1),
  KV_NAMESPACE_ID: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  VECTORIZE_INDEX: z.string().min(1).optional(),
  WORKERS_AI_ACCOUNT: z.string().min(1).optional(),
});

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: unknown): AppConfig {
  return EnvSchema.parse(env);
}
`,
  'packages/config/src/bindings.ts': `export interface CloudflareBindings {
  JWT_SECRET: string;
  DATABASE_URL?: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN?: string;
  D1_DATABASE_ID: string;
  KV_NAMESPACE_ID: string;
  R2_BUCKET: string;
  VECTORIZE_INDEX?: string;
  WORKERS_AI_ACCOUNT?: string;
}
`,
  'packages/config/src/features.ts': `export interface FeatureFlags {
  ai: boolean;
  payroll: boolean;
  pbx: boolean;
  bizForma: boolean;
}

export const DefaultFeatures: FeatureFlags = {
  ai: true,
  payroll: false,
  pbx: false,
  bizForma: true,
};

export function loadFeatures(overrides: Partial<FeatureFlags> = {}): FeatureFlags {
  return {
    ...DefaultFeatures,
    ...overrides,
  };
}
`,
  'packages/config/src/metadata.ts': `export const AppMetadata = {
  name: 'InsightHunter',
  version: '0.1.0',
  apiVersion: 'v1',
} as const;
`,
  'packages/config/src/index.ts': `export * from './bindings.js';
export * from './env.js';
export * from './features.js';
export * from './metadata.js';
`,
  'packages/config/tests/env.test.ts': `import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/env.js';

describe('@ih/config', () => {
  it('parses valid configuration', () => {
    const config = loadConfig({
      NODE_ENV: 'development',
      JWT_SECRET: '12345678901234567890123456789012',
      CLOUDFLARE_ACCOUNT_ID: 'cf-account',
      D1_DATABASE_ID: 'd1-id',
      KV_NAMESPACE_ID: 'kv-id',
      R2_BUCKET: 'bucket-name',
    });

    expect(config.NODE_ENV).toBe('development');
    expect(config.JWT_SECRET).toHaveLength(32);
    expect(config.R2_BUCKET).toBe('bucket-name');
  });

  it('throws on invalid configuration', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'development',
        JWT_SECRET: 'short',
        CLOUDFLARE_ACCOUNT_ID: 'cf-account',
        D1_DATABASE_ID: 'd1-id',
        KV_NAMESPACE_ID: 'kv-id',
        R2_BUCKET: 'bucket-name',
      }),
    ).toThrow();
  });
});
`,
  'packages/logger/package.json': `{
  "name": "@ih/logger",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "biome check src tests",
    "test": "vitest run",
    "clean": "rimraf dist"
  },
  "devDependencies": {
    "rimraf": "^6.0.1",
    "vitest": "^3.2.4"
  }
}
`,
  'packages/logger/tsconfig.json': `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "composite": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "tests", "node_modules"]
}
`,
  'packages/logger/README.md': `# @ih/logger

Structured JSON logging for InsightHunter services.

## Scripts

- \`pnpm build\`
- \`pnpm lint\`
- \`pnpm test\`
- \`pnpm clean\`
`,
  'packages/logger/src/types.ts': `export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  organizationId?: string;
  userId?: string;
  worker?: string;
  [key: string]: unknown;
}

export interface LogEntry extends LogContext {
  timestamp: string;
  level: LogLevel;
  message: string;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(context: LogContext): Logger;
}
`,
  'packages/logger/src/sanitize.ts': `const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'jwt',
  'secret',
  'apiKey',
  'ssn',
]);

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return sanitizeContext(value as Record<string, unknown>);
  }

  return value;
}

export function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    sanitized[key] = SENSITIVE_KEYS.has(key) ? '[REDACTED]' : sanitizeValue(value);
  }

  return sanitized;
}
`,
  'packages/logger/src/logger.ts': `import { sanitizeContext } from './sanitize.js';
import type { LogContext, LogEntry, LogLevel, Logger } from './types.js';

export interface LoggerOptions {
  worker: string;
  minLevel?: LogLevel;
  sink?: (entry: LogEntry) => void;
  baseContext?: LogContext;
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[minLevel];
}

function defaultSink(entry: LogEntry): void {
  const serialized = JSON.stringify(entry);

  switch (entry.level) {
    case 'debug':
      console.debug(serialized);
      break;
    case 'info':
      console.info(serialized);
      break;
    case 'warn':
      console.warn(serialized);
      break;
    case 'error':
      console.error(serialized);
      break;
  }
}

class StructuredLogger implements Logger {
  private readonly worker: string;
  private readonly minLevel: LogLevel;
  private readonly sink: (entry: LogEntry) => void;
  private readonly baseContext: LogContext;

  constructor(options: LoggerOptions) {
    this.worker = options.worker;
    this.minLevel = options.minLevel ?? 'info';
    this.sink = options.sink ?? defaultSink;
    this.baseContext = {
      worker: options.worker,
      ...options.baseContext,
    };
  }

  debug(message: string, context: LogContext = {}): void {
    this.write('debug', message, context);
  }

  info(message: string, context: LogContext = {}): void {
    this.write('info', message, context);
  }

  warn(message: string, context: LogContext = {}): void {
    this.write('warn', message, context);
  }

  error(message: string, context: LogContext = {}): void {
    this.write('error', message, context);
  }

  child(context: LogContext): Logger {
    return new StructuredLogger({
      worker: this.worker,
      minLevel: this.minLevel,
      sink: this.sink,
      baseContext: {
        ...this.baseContext,
        ...context,
      },
    });
  }

  private write(level: LogLevel, message: string, context: LogContext): void {
    if (!shouldLog(level, this.minLevel)) {
      return;
    }

    const mergedContext = sanitizeContext({
      ...this.baseContext,
      ...context,
    });

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...mergedContext,
    };

    this.sink(entry);
  }
}

export function createLogger(options: LoggerOptions): Logger {
  return new StructuredLogger(options);
}
`,
  'packages/logger/src/index.ts': `export * from './logger.js';
export * from './sanitize.js';
export * from './types.js';
`,
  'packages/logger/tests/logger.test.ts': `import { describe, expect, it, vi } from 'vitest';
import { createLogger } from '../src/logger.js';
import type { LogEntry } from '../src/types.js';

describe('@ih/logger', () => {
  it('writes structured log entries', () => {
    const sink = vi.fn<(entry: LogEntry) => void>();
    const logger = createLogger({
      worker: 'auth',
      sink,
    });

    logger.info('User logged in', {
      requestId: 'req-123',
      organizationId: 'org-123',
      userId: 'user-123',
    });

    expect(sink).toHaveBeenCalledTimes(1);

    const entry = sink.mock.calls[0]?.[0];
    expect(entry?.level).toBe('info');
    expect(entry?.message).toBe('User logged in');
    expect(entry?.worker).toBe('auth');
    expect(entry?.requestId).toBe('req-123');
  });

  it('redacts sensitive fields', () => {
    const sink = vi.fn<(entry: LogEntry) => void>();
    const logger = createLogger({
      worker: 'auth',
      sink,
    });

    logger.info('Auth attempt', {
      token: 'secret-token',
      password: 'super-secret',
    });

    const entry = sink.mock.calls[0]?.[0];
    expect(entry?.token).toBe('[REDACTED]');
    expect(entry?.password).toBe('[REDACTED]');
  });

  it('creates child loggers with inherited context', () => {
    const sink = vi.fn<(entry: LogEntry) => void>();
    const root = createLogger({
      worker: 'auth',
      sink,
      baseContext: {
        organizationId: 'org-123',
      },
    });

    const child = root.child({
      requestId: 'req-123',
    });

    child.warn('Rate limit warning');

    const entry = sink.mock.calls[0]?.[0];
    expect(entry?.worker).toBe('auth');
    expect(entry?.organizationId).toBe('org-123');
    expect(entry?.requestId).toBe('req-123');
    expect(entry?.level).toBe('warn');
  });
});
`,
  'packages/events/package.json': `{
  "name": "@ih/events",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "biome check src tests",
    "test": "vitest run",
    "clean": "rimraf dist"
  },
  "devDependencies": {
    "rimraf": "^6.0.1",
    "vitest": "^3.2.4"
  }
}
`,
  'packages/events/tsconfig.json': `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "composite": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "tests", "node_modules"]
}
`,
  'packages/events/README.md': `# @ih/events

Shared domain events and event bus primitives for InsightHunter.

## Scripts

- \`pnpm build\`
- \`pnpm lint\`
- \`pnpm test\`
- \`pnpm clean\`
`,
  'packages/events/src/types.ts': `export interface DomainEvent<T = unknown> {
  id: string;
  type: string;
  occurredAt: string;
  organizationId: string;
  payload: T;
}

export type EventHandler<TEvent extends DomainEvent = DomainEvent> = (
  event: TEvent,
) => void | Promise<void>;

export type Unsubscribe = () => void;

export interface EventBus {
  publish<TEvent extends DomainEvent>(event: TEvent): Promise<void>;
  subscribe<TEvent extends DomainEvent>(type: string, handler: EventHandler<TEvent>): Unsubscribe;
}
`,
  'packages/events/src/event-types.ts': `export const EventTypes = {
  OrganizationCreated: 'organization.created',
  UserRegistered: 'user.registered',
  UserLoggedIn: 'user.logged_in',
  JournalCreated: 'journal.created',
  JournalPosted: 'journal.posted',
  JournalReversed: 'journal.reversed',
  InvoiceCreated: 'invoice.created',
  InvoicePaid: 'invoice.paid',
  PayrollProcessed: 'payroll.processed',
  ReportGenerated: 'report.generated',
  AiConversationStarted: 'ai.conversation.started',
  AiResponseGenerated: 'ai.response.generated',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];
`,
  'packages/events/src/create-event.ts': `import type { DomainEvent } from './types.js';

export interface CreateDomainEventInput<TPayload> {
  id?: string;
  type: string;
  organizationId: string;
  payload: TPayload;
  occurredAt?: string;
}

export function createDomainEvent<TPayload>(
  input: CreateDomainEventInput<TPayload>,
): DomainEvent<TPayload> {
  return {
    id: input.id ?? crypto.randomUUID(),
    type: input.type,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    organizationId: input.organizationId,
    payload: input.payload,
  };
}
`,
  'packages/events/src/in-memory-event-bus.ts': `import type { DomainEvent, EventBus, EventHandler, Unsubscribe } from './types.js';

type HandlerMap = Map<string, Set<EventHandler>>;

export class InMemoryEventBus implements EventBus {
  private readonly handlers: HandlerMap = new Map();

  subscribe<TEvent extends DomainEvent>(
    type: string,
    handler: EventHandler<TEvent>,
  ): Unsubscribe {
    const handlersForType = this.handlers.get(type) ?? new Set<EventHandler>();
    handlersForType.add(handler as EventHandler);
    this.handlers.set(type, handlersForType);

    return () => {
      const currentHandlers = this.handlers.get(type);
      if (!currentHandlers) {
        return;
      }

      currentHandlers.delete(handler as EventHandler);

      if (currentHandlers.size === 0) {
        this.handlers.delete(type);
      }
    };
  }

  async publish<TEvent extends DomainEvent>(event: TEvent): Promise<void> {
    const handlersForType = this.handlers.get(event.type);
    if (!handlersForType || handlersForType.size === 0) {
      return;
    }

    for (const handler of handlersForType) {
      await handler(event);
    }
  }
}
`,
  'packages/events/src/index.ts': `export * from './create-event.js';
export * from './event-types.js';
export * from './in-memory-event-bus.js';
export * from './types.js';
`,
  'packages/events/tests/events.test.ts': `import { describe, expect, it, vi } from 'vitest';
import { createDomainEvent } from '../src/create-event.js';
import { EventTypes } from '../src/event-types.js';
import { InMemoryEventBus } from '../src/in-memory-event-bus.js';

describe('@ih/events', () => {
  it('creates domain events with defaults', () => {
    const event = createDomainEvent({
      type: EventTypes.UserRegistered,
      organizationId: 'org-123',
      payload: {
        userId: 'user-123',
      },
    });

    expect(event.id).toBeTypeOf('string');
    expect(event.type).toBe('user.registered');
    expect(event.organizationId).toBe('org-123');
    expect(event.occurredAt).toBeTypeOf('string');
    expect(event.payload).toEqual({
      userId: 'user-123',
    });
  });

  it('publishes events to subscribed handlers', async () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();

    bus.subscribe(EventTypes.JournalPosted, handler);

    const event = createDomainEvent({
      type: EventTypes.JournalPosted,
      organizationId: 'org-123',
      payload: {
        journalId: 'journal-123',
      },
    });

    await bus.publish(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('unsubscribes handlers', async () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();

    const unsubscribe = bus.subscribe(EventTypes.InvoicePaid, handler);
    unsubscribe();

    const event = createDomainEvent({
      type: EventTypes.InvoicePaid,
      organizationId: 'org-123',
      payload: {
        invoiceId: 'invoice-123',
      },
    });

    await bus.publish(event);

    expect(handler).not.toHaveBeenCalled();
  });
});
`,
};

async function main() {
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = resolve(process.cwd(), relativePath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, 'utf8');
    console.log(`wrote ${relativePath}`);
  }

  console.log(`\nDone. Wrote ${Object.keys(files).length} files.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
