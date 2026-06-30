import { sanitizeContext } from './sanitize.js';
import type { LogContext, LogEntry, LogLevel, Logger } from './types.js';

export interface LoggerOptions {
  worker: string;
  minLevel?: LogLevel;
  sink?: (entry: LogEntry) => void;
  baseContext?: LogContext;
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[minLevel];
}

function defaultSink(entry: LogEntry): void {
  const serialized = JSON.stringify(entry);

  switch (entry.level) {
    case 'debug':
      console.debug(serialized);
      break;
    case 'info':
      console.info(serialized);
      break;
    case 'warn':
      console.warn(serialized);
      break;
    case 'error':
      console.error(serialized);
      break;
  }
}

class StructuredLogger implements Logger {
  private readonly worker: string;
  private readonly minLevel: LogLevel;
  private readonly sink: (entry: LogEntry) => void;
  private readonly baseContext: LogContext;

  constructor(options: LoggerOptions) {
    this.worker = options.worker;
    this.minLevel = options.minLevel ?? 'info';
    this.sink = options.sink ?? defaultSink;
    this.baseContext = {
      worker: options.worker,
      ...options.baseContext,
    };
  }

  debug(message: string, context: LogContext = {}): void {
    this.write('debug', message, context);
  }

  info(message: string, context: LogContext = {}): void {
    this.write('info', message, context);
  }

  warn(message: string, context: LogContext = {}): void {
    this.write('warn', message, context);
  }

  error(message: string, context: LogContext = {}): void {
    this.write('error', message, context);
  }

  child(context: LogContext): Logger {
    return new StructuredLogger({
      worker: this.worker,
      minLevel: this.minLevel,
      sink: this.sink,
      baseContext: {
        ...this.baseContext,
        ...context,
      },
    });
  }

  private write(level: LogLevel, message: string, context: LogContext): void {
    if (!shouldLog(level, this.minLevel)) {
      return;
    }

    const mergedContext = sanitizeContext({
      ...this.baseContext,
      ...context,
    });

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...mergedContext,
    };

    this.sink(entry);
  }
}

export function createLogger(options: LoggerOptions): Logger {
  return new StructuredLogger(options);
}
