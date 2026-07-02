import { describe, expect, it } from 'vitest';
import { Maybe } from '../src/primitives/Maybe.js';

describe('Maybe', () => {
  it('tracks presence', () => {
    expect(Maybe.some('x').hasValue).toBe(true);
    expect(Maybe.none<string>().hasValue).toBe(false);
  });
});
