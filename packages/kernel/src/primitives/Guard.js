import { ValidationError } from "../errors/DomainError.js";
import { Result } from "./Result.js";
export class Guard {
  static againstNullOrUndefined(value, name) {
    if (value === null || value === undefined) {
      return Result.fail(new ValidationError(`${name} is required.`, { name }));
    }
    return Result.ok(value);
  }
  static againstEmptyString(value, name) {
    if (value.trim().length === 0) {
      return Result.fail(new ValidationError(`${name} cannot be empty.`, { name }));
    }
    return Result.ok(value);
  }
  static againstOutOfRange(value, name, min, max) {
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
  static againstInvalidState(condition, message, details) {
    return condition ? Result.fail(new ValidationError(message, details)) : Result.ok(true);
  }
  static all(guards) {
    for (const guard of guards) {
      if (guard.isFail()) {
        return Result.fail(guard.error);
      }
    }
    return Result.ok(true);
  }
}
//# sourceMappingURL=Guard.js.map
