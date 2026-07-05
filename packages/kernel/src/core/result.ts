export class Result<TValue, TError = Error> {
  private readonly valueInternal: TValue | null;
  private readonly errorInternal: TError | null;

  private constructor(value: TValue | null, error: TError | null) {
    this.valueInternal = value;
    this.errorInternal = error;
  }

  public static ok<TValue>(value: TValue): Result<TValue, never> {
    return new Result<TValue, never>(value, null);
  }

  public static fail<TError>(error: TError): Result<never, TError> {
    return new Result<never, TError>(null, error);
  }

  public get isSuccess(): boolean {
    return this.errorInternal === null;
  }

  public get isFailure(): boolean {
    return !this.isSuccess;
  }

  public get value(): TValue {
    if (this.valueInternal === null) {
      throw new Error("Cannot read the value of a failed result.");
    }

    return this.valueInternal;
  }

  public get error(): TError {
    if (this.errorInternal === null) {
      throw new Error("Cannot read the error of a successful result.");
    }

    return this.errorInternal;
  }

  public map<TNext>(mapper: (value: TValue) => TNext): Result<TNext, TError> {
    if (this.isFailure) {
      return Result.fail(this.error);
    }

    return Result.ok(mapper(this.value));
  }
}
