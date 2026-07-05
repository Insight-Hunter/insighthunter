import { ValueObject } from "../domain/ValueObject.js";

export class Percentage extends ValueObject<{ value: number }> {
  private constructor(value: number) {
    super({ value });
  }

  static create(value: number): Percentage {
    if (value < 0 || value > 100) throw new Error("Percentage must be between 0 and 100");
    return new Percentage(value);
  }

  get value(): number {
    return this.props.value;
  }
}
