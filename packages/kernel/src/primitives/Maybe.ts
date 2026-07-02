export class Maybe<T> {
  private readonly value: T | null | undefined;

  private constructor(value: T | null | undefined) {
    this.value = value;
  }

  public static some<T>(value: T): Maybe<T> {
    if (value === null || value === undefined) {
      throw new TypeError("Cannot create Some from null or undefined.");
    }

    return new Maybe<T>(value);
  }

  public static none<T>(): Maybe<T> {
    return new Maybe<T>(undefined);
  }

  public static fromNullable<T>(value: T | null | undefined): Maybe<T> {
    return value === null || value === undefined
      ? Maybe.none<T>()
      : Maybe.some<T>(value);
  }

  public isSome(): boolean {
    return this.value !== null && this.value !== undefined;
  }

  public isNone(): boolean {
    return !this.isSome();
  }

  public map<U>(mapper: (value: T) => U): Maybe<U> {
    return this.isSome() ? Maybe.fromNullable(mapper(this.value as T)) : Maybe.none<U>();
  }

  public flatMap<U>(mapper: (value: T) => Maybe<U>): Maybe<U> {
    return this.isSome() ? mapper(this.value as T) : Maybe.none<U>();
  }

  public match<U>(handlers: {
    some: (value: T) => U;
    none: () => U;
  }): U {
    return this.isSome()
      ? handlers.some(this.value as T)
      : handlers.none();
  }

  public getOrElse(fallback: T): T {
    return this.isSome() ? (this.value as T) : fallback;
  }

  public getOrThrow(message = "Expected value to be present."): T {
    if (this.isNone()) {
      throw new Error(message);
    }

    return this.value as T;
  }

  public toNullable(): T | null {
    return this.isSome() ? (this.value as T) : null;
  }
}
