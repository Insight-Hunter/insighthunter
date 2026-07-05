import { ValueObject } from "../domain/ValueObject.js";
export declare class Percentage extends ValueObject<{
  value: number;
}> {
  private constructor();
  static create(value: number): Percentage;
  get value(): number;
}
