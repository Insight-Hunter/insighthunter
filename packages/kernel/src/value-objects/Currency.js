import { ValueObject } from "../domain/ValueObject.js";
const SUPPORTED = new Set(["USD", "EUR", "GBP", "CAD"]);
export class Currency extends ValueObject {
  constructor(code) {
    super({ code });
  }
  static create(code) {
    const upper = code.toUpperCase();
    if (!SUPPORTED.has(upper)) throw new Error(`Unsupported currency: ${code}`);
    return new Currency(upper);
  }
  get code() {
    return this.props.code;
  }
}
//# sourceMappingURL=Currency.js.map
