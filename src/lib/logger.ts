import { env } from "./env";

/**
 * DevBrand Observability Wrapper
 * 
 * This provides a unified interface for logging and error tracking.
 * Currently stubs Sentry/Logtail for Edge performance.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'fatal';

interface LogContext {
  userId?: string;
  prUrl?: string;
  layer?: number;
  [key: string]: any;
}

export const logger = {
  log: (level: LogLevel, message: string, context?: LogContext) => {
    const timestamp = new Date().toISOString();
    const payload = JSON.stringify({ timestamp, level, message, ...context });
    
    // In production, we'd send this to a log drain or Sentry
    if (env.NODE_ENV === 'production') {
      console.log(`[DEVBRAND_LOG] ${payload}`);
      // if (Sentry) Sentry.captureMessage(message, { level, extra: context });
    } else {
      console.log(`[${level.toUpperCase()}] ${message}`, context || '');
    }
  },

  error: (err: Error, context?: LogContext) => {
    logger.log('error', err.message, { stack: err.stack, ...context });
    // if (Sentry) Sentry.captureException(err, { extra: context });
  },

  info: (message: string, context?: LogContext) => logger.log('info', message, context),
  warn: (message: string, context?: LogContext) => logger.log('warn', message, context),
};
