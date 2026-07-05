import { ValueObject } from "../domain/ValueObject.js";
export class Percentage extends ValueObject {
  constructor(value) {
    super({ value });
  }
  static create(value) {
    if (value < 0 || value > 100) throw new Error("Percentage must be between 0 and 100");
    return new Percentage(value);
  }
  get value() {
    return this.props.value;
  }
}
//# sourceMappingURL=Percentage.js.map
