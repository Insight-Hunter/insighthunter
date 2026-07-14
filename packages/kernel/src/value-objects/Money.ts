import { ValueObject } from "../domain/ValueObject.js";
import type { Currency } from "./Currency.js";

export class Money extends ValueObject<{ amount: number; currency: Currency }> {
  private constructor(amount: number, currency: Currency) {
    super({ amount, currency });
  }

  static create(amount: number, currency: Currency): Money {
    if (!Number.isFinite(amount)) throw new Error("Amount must be finite");
    return new Money(amount, currency);
  }

  add(other: Money): Money {
    if (this.currency.code !== other.currency.code) throw new Error("Currency mismatch");
    return new Money(this.amount + other.amount, this.currency);
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): Currency {
    return this.props.currency;
  }
}
