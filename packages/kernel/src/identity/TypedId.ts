import { UniqueId } from "./UniqueId.js";

declare const typedIdBrand: unique symbol;

export type TypedIdValue<TName extends string> = string & {
  readonly [typedIdBrand]: TName;
};

export class TypedId<TName extends string> extends UniqueId {
  public readonly kind: TName;

  private constructor(kind: TName, value?: string) {
    super(value);
    this.kind = kind;
  }

  public static override create<TName extends string>(kind: TName, value?: string): TypedId<TName> {
    return new TypedId(kind, value);
  }

  public override toString(): TypedIdValue<TName> {
    return super.toString() as TypedIdValue<TName>;
  }

  public override equals(other: TypedId<TName>): boolean {
    return this.kind === other.kind && super.equals(other);
  }
}
