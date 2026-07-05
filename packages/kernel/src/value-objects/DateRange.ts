import { ValueObject } from "../domain/ValueObject.js";

export class DateRange extends ValueObject<{ start: Date; end: Date }> {
  private constructor(start: Date, end: Date) {
    super({ start, end });
  }

  static create(start: Date, end: Date): DateRange {
    if (start > end) throw new Error("Start date must be before or equal to end date");
    return new DateRange(start, end);
  }

  includes(date: Date): boolean {
    return date >= this.props.start && date <= this.props.end;
  }
}
