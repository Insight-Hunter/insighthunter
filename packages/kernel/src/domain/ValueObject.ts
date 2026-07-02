function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);

    for (const key of Object.keys(value as Record<string, unknown>)) {
      const nested = (value as Record<string, unknown>)[key];
      if (nested && typeof nested === "object") {
        deepFreeze(nested);
      }
    }
  }

  return value as Readonly<T>;
}

export abstract class ValueObject<TProps extends object> {
  protected readonly props: Readonly<TProps>;

  protected constructor(props: TProps) {
    this.props = deepFreeze(structuredClone(props));
  }

  public equals(other: ValueObject<TProps>): boolean {
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }

  public unpack(): Readonly<TProps> {
    return this.props;
  }
}
