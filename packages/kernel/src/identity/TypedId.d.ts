import { UniqueId } from "./UniqueId.js";
declare const typedIdBrand: unique symbol;
export type TypedIdValue<TName extends string> = string & {
  readonly [typedIdBrand]: TName;
};
export declare class TypedId<TName extends string> extends UniqueId {
  readonly kind: TName;
  private constructor();
  static create<TName extends string>(kind: TName, value?: string): TypedId<TName>;
  toString(): TypedIdValue<TName>;
  equals(other: TypedId<TName>): boolean;
}
