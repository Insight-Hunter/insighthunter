import { ValueObject } from "../domain/ValueObject.js";
export class Money extends ValueObject {
  constructor(amount, currency) {
    super({ amount, currency });
  }
  static create(amount, currency) {
    if (!Number.isFinite(amount)) throw new Error("Amount must be finite");
    return new Money(amount, currency);
  }
  add(other) {
    if (this.currency.code !== other.currency.code) throw new Error("Currency mismatch");
    return new Money(this.amount + other.amount, this.currency);
  }
  get amount() {
    return this.props.amount;
  }
  get currency() {
    return this.props.currency;
  }
}
//# sourceMappingURL=Money.js.map
