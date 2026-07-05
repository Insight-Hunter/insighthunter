export interface DomainErrorDetails {
  readonly code: string;
  readonly message: string;
  readonly cause?: unknown;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
export declare class DomainError extends Error {
  readonly code: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  constructor(details: DomainErrorDetails);
}
export declare class InvariantViolationError extends DomainError {
  constructor(message: string, metadata?: Readonly<Record<string, unknown>>);
}
export declare class NotFoundError extends DomainError {
  constructor(entity: string, id: string);
}
