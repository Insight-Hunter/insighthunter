export class DomainError extends Error {
  public readonly code: string;
  public readonly details?: Readonly<Record<string, unknown>>;

  public constructor(
    message: string,
    options?: {
      code?: string;
      details?: Readonly<Record<string, unknown>>;
      cause?: unknown;
    },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.code = options?.code ?? "DOMAIN_ERROR";
    this.details = options?.details;
  }
}

export class ValidationError extends DomainError {
  public constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, { code: "VALIDATION_ERROR", details });
  }
}

export class InvariantViolationError extends DomainError {
  public constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, { code: "INVARIANT_VIOLATION", details });
  }
}

export class NotFoundError extends DomainError {
  public constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, { code: "NOT_FOUND", details });
  }
}

export class ConcurrencyError extends DomainError {
  public constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, { code: "CONCURRENCY_ERROR", details });
  }
}
