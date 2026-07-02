export type Result<TValue, TError = Error> = Ok<TValue> | Err<TError>;

export interface Ok<TValue> {
  readonly ok: true;
  readonly value: TValue;
}

export interface Err<TError> {
  readonly ok: false;
  readonly error: TError;
}

export function ok<TValue>(value: TValue): Ok<TValue> {
  return { ok: true, value };
}

export function err<TError>(error: TError): Err<TError> {
  return { ok: false, error };
}

export function isOk<TValue, TError>(
  result: Result<TValue, TError>,
): result is Ok<TValue> {
  return result.ok;
}

export function isErr<TValue, TError>(
  result: Result<TValue, TError>,
): result is Err<TError> {
  return !result.ok;
}

export function unwrap<TValue, TError>(result: Result<TValue, TError>): TValue {
  if (result.ok) {
    return result.value;
  }

  throw result.error;
}

export function mapResult<TValue, TNext, TError>(
  result: Result<TValue, TError>,
  mapper: (value: TValue) => TNext,
): Result<TNext, TError> {
  if (!result.ok) {
    return result;
  }

  return ok(mapper(result.value));
}
