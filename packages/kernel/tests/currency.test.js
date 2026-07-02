import { describe, expect, it } from 'vitest';
import { Currency } from '../src/value-objects/Currency.js';
describe('Currency', () => {
    it('normalizes codes', () => {
        expect(Currency.create('usd').code).toBe('USD');
    });
});
//# sourceMappingURL=currency.test.js.map