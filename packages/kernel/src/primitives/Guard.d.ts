import type { ValidationError } from "../errors/DomainError.js";
import type { Result } from "./Result.js";
export declare class Guard {
  static againstNullOrUndefined<T>(
    value: T | null | undefined,
    name: string,
  ): Result<T, ValidationError>;
  static againstEmptyString(value: string, name: string): Result<string, ValidationError>;
  static againstOutOfRange(
    value: number,
    name: string,
    min: number,
    max: number,
  ): Result<number, ValidationError>;
  static againstInvalidState(
    condition: boolean,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ): Result<true, ValidationError>;
  static all(
    guards: ReadonlyArray<Result<unknown, ValidationError>>,
  ): Result<true, ValidationError>;
}
