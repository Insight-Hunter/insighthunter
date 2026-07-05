import type { Clock } from "./clock.js";
import type { RequestContext } from "./context.js";
import type { IdGenerator } from "./ids.js";
export interface CloudflareExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException?(): void;
}
export interface D1PreparedStatementLike {
  bind(...values: readonly unknown[]): D1PreparedStatementLike;
  first<T = unknown>(column?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{
    results: T[];
    success: boolean;
  }>;
  run(): Promise<{
    success: boolean;
    meta: unknown;
  }>;
}
export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch<T = unknown>(statements: readonly D1PreparedStatementLike[]): Promise<T[]>;
}
export interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: Record<string, unknown>): Promise<void>;
  delete(key: string): Promise<void>;
}
export interface R2BucketLike {
  get(key: string): Promise<unknown | null>;
  put(key: string, value: ReadableStream | ArrayBuffer | string): Promise<unknown>;
  delete(key: string): Promise<void>;
}
export interface CloudflareBindings {
  readonly DB?: D1DatabaseLike;
  readonly KV?: KVNamespaceLike;
  readonly R2?: R2BucketLike;
  readonly AI?: unknown;
  readonly VECTORIZE?: unknown;
  readonly [binding: string]: unknown;
}
export interface KernelRuntime<TEnv extends CloudflareBindings = CloudflareBindings> {
  readonly env: TEnv;
  readonly ctx?: CloudflareExecutionContext;
  readonly requestContext: RequestContext;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  waitUntil(promise: Promise<unknown>): void;
}
export interface CreateKernelRuntimeInput<TEnv extends CloudflareBindings> {
  readonly env: TEnv;
  readonly ctx?: CloudflareExecutionContext;
  readonly request?: Request;
  readonly requestContext?: RequestContext;
  readonly clock?: Clock;
  readonly ids?: IdGenerator;
}
export declare function createKernelRuntime<TEnv extends CloudflareBindings>(
  input: CreateKernelRuntimeInput<TEnv>,
): KernelRuntime<TEnv>;
