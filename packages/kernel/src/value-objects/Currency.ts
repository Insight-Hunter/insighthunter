import { ValueObject } from "../domain/ValueObject.js";

const SUPPORTED = new Set(["USD", "EUR", "GBP", "CAD"]);

export class Currency extends ValueObject<{ code: string }> {
  private constructor(code: string) {
    super({ code });
  }

  static create(code: string): Currency {
    const upper = code.toUpperCase();
    if (!SUPPORTED.has(upper)) throw new Error(`Unsupported currency: ${code}`);
    return new Currency(upper);
  }

  get code(): string {
    return this.props.code;
  }
}
