export declare class Maybe<T> {
    private readonly value;
    private constructor();
    static some<T>(value: T): Maybe<T>;
    static none<T>(): Maybe<T>;
    static fromNullable<T>(value: T | null | undefined): Maybe<T>;
    isSome(): boolean;
    isNone(): boolean;
    map<U>(mapper: (value: T) => U): Maybe<U>;
    flatMap<U>(mapper: (value: T) => Maybe<U>): Maybe<U>;
    match<U>(handlers: {
        some: (value: T) => U;
        none: () => U;
    }): U;
    getOrElse(fallback: T): T;
    getOrThrow(message?: string): T;
    toNullable(): T | null;
}
