import { ValidationError } from "../errors/DomainError.js";
import { Result } from "./Result.js";

export class Guard {
  public static againstNullOrUndefined<T>(
    value: T | null | undefined,
    name: string,
  ): Result<T, ValidationError> {
    if (value === null || value === undefined) {
      return Result.fail(new ValidationError(`${name} is required.`, { name }));
    }

    return Result.ok(value);
  }

  public static againstEmptyString(
    value: string,
    name: string,
  ): Result<string, ValidationError> {
    if (value.trim().length === 0) {
      return Result.fail(new ValidationError(`${name} cannot be empty.`, { name }));
    }

    return Result.ok(value);
  }

  public static againstOutOfRange(
    value: number,
    name: string,
    min: number,
    max: number,
  ): Result<number, ValidationError> {
    if (value < min || value > max) {
      return Result.fail(
        new ValidationError(`${name} must be between ${min} and ${max}.`, {
          name,
          min,
          max,
          value,
        }),
      );
    }

    return Result.ok(value);
  }

  public static againstInvalidState(
    condition: boolean,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ): Result<true, ValidationError> {
    return condition
      ? Result.fail(new ValidationError(message, details))
      : Result.ok(true);
  }

  public static all(
    guards: ReadonlyArray<Result<unknown, ValidationError>>,
  ): Result<true, ValidationError> {
    for (const guard of guards) {
      if (guard.isFail()) {
        return Result.fail(guard.error);
      }
    }

    return Result.ok(true);
  }
}
