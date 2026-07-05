export class DomainError extends Error {
  code;
  details;
  constructor(message, options) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.code = options?.code ?? "DOMAIN_ERROR";
    this.details = options?.details;
  }
}
export class ValidationError extends DomainError {
  constructor(message, details) {
    super(message, { code: "VALIDATION_ERROR", details });
  }
}
export class InvariantViolationError extends DomainError {
  constructor(message, details) {
    super(message, { code: "INVARIANT_VIOLATION", details });
  }
}
export class NotFoundError extends DomainError {
  constructor(message, details) {
    super(message, { code: "NOT_FOUND", details });
  }
}
export class ConcurrencyError extends DomainError {
  constructor(message, details) {
    super(message, { code: "CONCURRENCY_ERROR", details });
  }
}
//# sourceMappingURL=DomainError.js.map
