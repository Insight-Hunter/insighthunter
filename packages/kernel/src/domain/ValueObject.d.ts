export declare abstract class ValueObject<TProps extends object> {
    protected readonly props: Readonly<TProps>;
    protected constructor(props: TProps);
    equals(other: ValueObject<TProps>): boolean;
    unpack(): Readonly<TProps>;
}
