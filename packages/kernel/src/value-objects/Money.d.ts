import { ValueObject } from "../domain/ValueObject.js";
import type { Currency } from "./Currency.js";
export declare class Money extends ValueObject<{
  amount: number;
  currency: Currency;
}> {
  private constructor();
  static create(amount: number, currency: Currency): Money;
  add(other: Money): Money;
  get amount(): number;
  get currency(): Currency;
}
