export class DomainError extends Error {
  code;
  metadata;
  constructor(details) {
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
  constructor(message, metadata = {}) {
    super({
      code: "domain.invariant_violation",
      message,
      metadata,
    });
    this.name = "InvariantViolationError";
  }
}
export class NotFoundError extends DomainError {
  constructor(entity, id) {
    super({
      code: "domain.not_found",
      message: `${entity} was not found`,
      metadata: { entity, id },
    });
    this.name = "NotFoundError";
  }
}
//# sourceMappingURL=errors.js.map
