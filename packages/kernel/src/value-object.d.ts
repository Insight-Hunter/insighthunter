export declare abstract class ValueObject<TProps extends object> {
  protected readonly props: Readonly<TProps>;
  protected constructor(props: Readonly<TProps>);
  equals(other: ValueObject<TProps>): boolean;
  toJSON(): Readonly<TProps>;
}
export declare function assertInvariant(condition: boolean, message: string): asserts condition;
