import * as Sentry from "@sentry/node";
import { logger } from "../../modules/core/logger";

export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    logger.warn("SENTRY_DSN is not set. Sentry initialization skipped.");
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  });

  logger.info("Sentry initialized successfully.");
}

export const captureException = (error: unknown, context?: Record<string, any>) => {
  logger.error(error, "Exception captured");
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
};
