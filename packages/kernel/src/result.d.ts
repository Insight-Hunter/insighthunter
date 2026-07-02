export type Result<TValue, TError = Error> = Ok<TValue> | Err<TError>;
export interface Ok<TValue> {
    readonly ok: true;
    readonly value: TValue;
}
export interface Err<TError> {
    readonly ok: false;
    readonly error: TError;
}
export declare function ok<TValue>(value: TValue): Ok<TValue>;
export declare function err<TError>(error: TError): Err<TError>;
export declare function isOk<TValue, TError>(result: Result<TValue, TError>): result is Ok<TValue>;
export declare function isErr<TValue, TError>(result: Result<TValue, TError>): result is Err<TError>;
export declare function unwrap<TValue, TError>(result: Result<TValue, TError>): TValue;
export declare function mapResult<TValue, TNext, TError>(result: Result<TValue, TError>, mapper: (value: TValue) => TNext): Result<TNext, TError>;
