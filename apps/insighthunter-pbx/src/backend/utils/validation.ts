// apps/insighthunter-pbx/src/backend/utils/validation.ts
//
// Minimal, dependency-free request-body validators. Real implementation (not
// a stub). Deliberately small/explicit rather than pulling in a schema
// library — revisit if/when the number of validated route bodies grows
// large enough to justify one (e.g. zod), per repo convention of not adding
// tooling speculatively.

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ValidationError(`"${field}" must be a non-empty string`);
  }
  return value;
}

export function requireOneOf<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    throw new ValidationError(`"${field}" must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}
