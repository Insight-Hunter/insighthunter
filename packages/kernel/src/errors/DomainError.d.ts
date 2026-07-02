export declare class DomainError extends Error {
    readonly code: string;
    readonly details?: Readonly<Record<string, unknown>>;
    constructor(message: string, options?: {
        code?: string;
        details?: Readonly<Record<string, unknown>>;
        cause?: unknown;
    });
}
export declare class ValidationError extends DomainError {
    constructor(message: string, details?: Readonly<Record<string, unknown>>);
}
export declare class InvariantViolationError extends DomainError {
    constructor(message: string, details?: Readonly<Record<string, unknown>>);
}
export declare class NotFoundError extends DomainError {
    constructor(message: string, details?: Readonly<Record<string, unknown>>);
}
export declare class ConcurrencyError extends DomainError {
    constructor(message: string, details?: Readonly<Record<string, unknown>>);
}
