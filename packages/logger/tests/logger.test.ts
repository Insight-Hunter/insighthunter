import { describe, expect, it, vi } from 'vitest';
import { createLogger } from '../src/logger.js';
import type { LogEntry } from '../src/types.js';

describe('@ih/logger', () => {
  it('writes structured log entries', () => {
    const sink = vi.fn<(entry: LogEntry) => void>();
    const logger = createLogger({
      worker: 'auth',
      sink,
    });

    logger.info('User logged in', {
      requestId: 'req-123',
      organizationId: 'org-123',
      userId: 'user-123',
    });

    expect(sink).toHaveBeenCalledTimes(1);

    const entry = sink.mock.calls[0]?.[0];
    expect(entry?.level).toBe('info');
    expect(entry?.message).toBe('User logged in');
    expect(entry?.worker).toBe('auth');
    expect(entry?.requestId).toBe('req-123');
  });

  it('redacts sensitive fields', () => {
    const sink = vi.fn<(entry: LogEntry) => void>();
    const logger = createLogger({
      worker: 'auth',
      sink,
    });

    logger.info('Auth attempt', {
      token: 'secret-token',
      password: 'super-secret',
    });

    const entry = sink.mock.calls[0]?.[0];
    expect(entry?.token).toBe('[REDACTED]');
    expect(entry?.password).toBe('[REDACTED]');
  });

  it('creates child loggers with inherited context', () => {
    const sink = vi.fn<(entry: LogEntry) => void>();
    const root = createLogger({
      worker: 'auth',
      sink,
      baseContext: {
        organizationId: 'org-123',
      },
    });

    const child = root.child({
      requestId: 'req-123',
    });

    child.warn('Rate limit warning');

    const entry = sink.mock.calls[0]?.[0];
    expect(entry?.worker).toBe('auth');
    expect(entry?.organizationId).toBe('org-123');
    expect(entry?.requestId).toBe('req-123');
    expect(entry?.level).toBe('warn');
  });
});
