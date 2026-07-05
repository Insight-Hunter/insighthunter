import { InvariantViolationError } from "./errors.js";

export abstract class ValueObject<TProps extends object> {
  protected constructor(protected readonly props: Readonly<TProps>) {
    Object.freeze(this.props);
  }

  equals(other: ValueObject<TProps>): boolean {
    return stableStringify(this.props) === stableStringify(other.props);
  }

  toJSON(): Readonly<TProps> {
    return this.props;
  }
}

export function assertInvariant(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new InvariantViolationError(message);
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys.map((key) => `${key}:${stableStringify(record[key])}`).join(",")}}`;
  }

  return JSON.stringify(value);
}
