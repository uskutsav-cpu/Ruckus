type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Readonly<Record<string, unknown>>;

const redactKeys = /authorization|email|password|secret|token/i;

function redact(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      redactKeys.test(key) ? '[REDACTED]' : value
    ])
  );
}

function write(level: LogLevel, event: string, context: LogContext = {}): void {
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...redact(context)
  });

  if (level === 'error') {
    console.error(record);
  } else if (level === 'warn') {
    console.warn(record);
  } else if (__DEV__) {
    // Development-only structured diagnostics intentionally use warn because the
    // production logger adapter is configured during deployment.
    console.warn(record);
  }
}

export const logger = {
  debug: (event: string, context?: LogContext) => write('debug', event, context),
  info: (event: string, context?: LogContext) => write('info', event, context),
  warn: (event: string, context?: LogContext) => write('warn', event, context),
  error: (event: string, context?: LogContext) => write('error', event, context)
};
