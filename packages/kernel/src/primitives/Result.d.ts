export declare class Result<TValue, TError = Error> {
  private readonly _value?;
  private readonly _error?;
  private readonly _isOk;
  private constructor();
  static ok<TValue, TError = never>(value: TValue): Result<TValue, TError>;
  static fail<TValue = never, TError = Error>(error: TError): Result<TValue, TError>;
  static try<TValue>(fn: () => TValue): Result<TValue, Error>;
  isOk(): boolean;
  isFail(): boolean;
  get value(): TValue;
  get error(): TError;
  map<U>(mapper: (value: TValue) => U): Result<U, TError>;
  flatMap<U>(mapper: (value: TValue) => Result<U, TError>): Result<U, TError>;
  mapError<UError>(mapper: (error: TError) => UError): Result<TValue, UError>;
  match<U>(handlers: {
    ok: (value: TValue) => U;
    fail: (error: TError) => U;
  }): U;
  getOrElse(fallback: TValue): TValue;
  getOrThrow(mapper?: (error: TError) => Error): TValue;
  tap(effect: (value: TValue) => void): Result<TValue, TError>;
  tapError(effect: (error: TError) => void): Result<TValue, TError>;
  static all<TValue, TError>(
    results: ReadonlyArray<Result<TValue, TError>>,
  ): Result<ReadonlyArray<TValue>, TError>;
}
