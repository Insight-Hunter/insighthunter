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
    if (options?.details !== undefined) {
      this.details = options.details;
    }
  }
}

export class ValidationError extends DomainError {
  public constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(
      message,
      details !== undefined ? { code: "VALIDATION_ERROR", details } : { code: "VALIDATION_ERROR" },
    );
  }
}

export class InvariantViolationError extends DomainError {
  public constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(
      message,
      details !== undefined
        ? { code: "INVARIANT_VIOLATION", details }
        : { code: "INVARIANT_VIOLATION" },
    );
  }
}

export class NotFoundError extends DomainError {
  public constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, details !== undefined ? { code: "NOT_FOUND", details } : { code: "NOT_FOUND" });
  }
}

export class ConcurrencyError extends DomainError {
  public constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(
      message,
      details !== undefined
        ? { code: "CONCURRENCY_ERROR", details }
        : { code: "CONCURRENCY_ERROR" },
    );
  }
}
