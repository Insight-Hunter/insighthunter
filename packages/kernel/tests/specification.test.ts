import { describe, expect, it } from "vitest";
import { CompositeSpecification } from "../src/domain/Specification.js";

class GreaterThanFive extends CompositeSpecification<number> {
  isSatisfiedBy(candidate: number): boolean {
    return candidate > 5;
  }
}

class EvenNumber extends CompositeSpecification<number> {
  isSatisfiedBy(candidate: number): boolean {
    return candidate % 2 === 0;
  }
}

describe("Specification", () => {
  it("composes with and", () => {
    const spec = new GreaterThanFive().and(new EvenNumber());
    expect(spec.isSatisfiedBy(8)).toBe(true);
    expect(spec.isSatisfiedBy(7)).toBe(false);
  });
});
