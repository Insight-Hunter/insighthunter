export interface DomainErrorDetails {
  readonly code: string;
  readonly message: string;
  readonly cause?: unknown;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export class DomainError extends Error {
  readonly code: string;
  readonly metadata: Readonly<Record<string, unknown>>;

  constructor(details: DomainErrorDetails) {
    super(details.message);
    this.name = "DomainError";
    this.code = details.code;
    this.metadata = details.metadata ?? {};

    if (details.cause !== undefined) {
      this.cause = details.cause;
    }
  }
}

export class InvariantViolationError extends DomainError {
  constructor(message: string, metadata: Readonly<Record<string, unknown>> = {}) {
    super({
      code: "domain.invariant_violation",
      message,
      metadata,
    });
    this.name = "InvariantViolationError";
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super({
      code: "domain.not_found",
      message: `${entity} was not found`,
      metadata: { entity, id },
    });
    this.name = "NotFoundError";
  }
}
