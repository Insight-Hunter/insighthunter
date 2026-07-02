declare const brand: unique symbol;

export type Brand<TValue, TBrand extends string> = TValue & {
  readonly [brand]: TBrand;
};

export function brandValue<TValue, TBrand extends string>(
  value: TValue,
): Brand<TValue, TBrand> {
  return value as Brand<TValue, TBrand>;
}
