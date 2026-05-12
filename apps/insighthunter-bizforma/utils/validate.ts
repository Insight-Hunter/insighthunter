export function requireString(value: unknown, field: string, max = 500) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new Error(`${field} exceeds max length`);
  }
  return trimmed;
}

export function optionalString(value: unknown, max = 500) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string') throw new Error('Invalid string value');
  if (value.length > max) throw new Error('String exceeds max length');
  return value.trim();
}

export function requireBoolean(value: unknown, field: string) {
  if (typeof value !== 'boolean') throw new Error(`${field} must be boolean`);
  return value;
}

export function requireNumber(value: unknown, field: string, min = 0, max = 1000) {
  if (typeof value !== 'number' || Number.isNaN(value)) throw new Error(`${field} must be a number`);
  if (value < min || value > max) throw new Error(`${field} out of range`);
  return value;
}
