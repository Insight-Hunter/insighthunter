type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  service: 'bookkeeping';
  timestamp: string;
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, context: Record<string, unknown> = {}): void {
  const entry: LogEntry = {
    level,
    service: 'bookkeeping',
    timestamp: new Date().toISOString(),
    message,
    ...context,
  };
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(JSON.stringify(entry));
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => log('debug', msg, ctx),
  info:  (msg: string, ctx?: Record<string, unknown>) => log('info',  msg, ctx),
  warn:  (msg: string, ctx?: Record<string, unknown>) => log('warn',  msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log('error', msg, ctx),
};
