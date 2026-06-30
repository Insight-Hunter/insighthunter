import { describe, expect, it } from 'vitest';
import { AccountType } from '../src/accounting.js';

describe('@ih/types', () => {
  it('exports accounting enums', () => {
    expect(AccountType.Asset).toBe('asset');
    expect(AccountType.Revenue).toBe('revenue');
  });
});
