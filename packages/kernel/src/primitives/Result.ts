export class Result<TValue, TError = Error> {
  private readonly _value: TValue | undefined;
  private readonly _error: TError | undefined;
  private readonly _isOk: boolean;

  private constructor(isOk: boolean, value?: TValue, error?: TError) {
    this._isOk = isOk;
    this._value = value;
    this._error = error;
  }

  public static ok<TValue, TError = never>(value: TValue): Result<TValue, TError> {
    return new Result<TValue, TError>(true, value);
  }

  public static fail<TValue = never, TError = Error>(error: TError): Result<TValue, TError> {
    return new Result<TValue, TError>(false, undefined, error);
  }

  public static try<TValue>(fn: () => TValue): Result<TValue, Error> {
    try {
      return Result.ok(fn());
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error("Unknown error."));
    }
  }

  public isOk(): boolean {
    return this._isOk;
  }

  public isFail(): boolean {
    return !this._isOk;
  }

  public get value(): TValue {
    if (this.isFail()) {
      throw new Error("Cannot access value of failed result.");
    }

    return this._value as TValue;
  }

  public get error(): TError {
    if (this.isOk()) {
      throw new Error("Cannot access error of successful result.");
    }

    return this._error as TError;
  }

  public map<U>(mapper: (value: TValue) => U): Result<U, TError> {
    return this.isOk() ? Result.ok(mapper(this.value)) : Result.fail(this.error);
  }

  public flatMap<U>(mapper: (value: TValue) => Result<U, TError>): Result<U, TError> {
    return this.isOk() ? mapper(this.value) : Result.fail(this.error);
  }

  public mapError<UError>(mapper: (error: TError) => UError): Result<TValue, UError> {
    return this.isOk() ? Result.ok(this.value) : Result.fail(mapper(this.error));
  }

  public match<U>(handlers: {
    ok: (value: TValue) => U;
    fail: (error: TError) => U;
  }): U {
    return this.isOk() ? handlers.ok(this.value) : handlers.fail(this.error);
  }

  public getOrElse(fallback: TValue): TValue {
    return this.isOk() ? this.value : fallback;
  }

  public getOrThrow(mapper?: (error: TError) => Error): TValue {
    if (this.isOk()) {
      return this.value;
    }

    if (mapper) {
      throw mapper(this.error);
    }

    throw this.error instanceof Error ? this.error : new Error("Result failed.");
  }

  public tap(effect: (value: TValue) => void): Result<TValue, TError> {
    if (this.isOk()) {
      effect(this.value);
    }

    return this;
  }

  public tapError(effect: (error: TError) => void): Result<TValue, TError> {
    if (this.isFail()) {
      effect(this.error);
    }

    return this;
  }

  public static all<TValue, TError>(
    results: ReadonlyArray<Result<TValue, TError>>,
  ): Result<ReadonlyArray<TValue>, TError> {
    const values: TValue[] = [];

    for (const result of results) {
      if (result.isFail()) {
        return Result.fail(result.error);
      }

      values.push(result.value);
    }

    return Result.ok(values);
  }
}
