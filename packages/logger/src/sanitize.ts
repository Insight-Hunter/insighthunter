const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'jwt',
  'secret',
  'apiKey',
  'ssn',
]);

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return sanitizeContext(value as Record<string, unknown>);
  }

  return value;
}

export function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    sanitized[key] = SENSITIVE_KEYS.has(key) ? '[REDACTED]' : sanitizeValue(value);
  }

  return sanitized;
}
