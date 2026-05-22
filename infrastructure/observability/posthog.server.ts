import { PostHog } from "posthog-node";
import { logger } from "../../modules/core/logger";

let posthogClient: PostHog | null = null;

export function initPostHog() {
  if (!process.env.POSTHOG_API_KEY) {
    logger.warn("POSTHOG_API_KEY is not set. Analytics disabled.");
    return;
  }

  posthogClient = new PostHog(process.env.POSTHOG_API_KEY, {
    host: process.env.POSTHOG_HOST || "https://app.posthog.com",
    flushAt: 1,
    flushInterval: 10000,
  });

  logger.info("PostHog initialized successfully.");
}

export const captureEvent = (
  eventName: string,
  distinctId: string,
  properties?: Record<string, any>
) => {
  logger.debug({ eventName, distinctId, properties }, "Tracking event");
  if (posthogClient) {
    posthogClient.capture({
      distinctId,
      event: eventName,
      properties,
    });
  }
};

export const shutdownPostHog = async () => {
  if (posthogClient) {
    await posthogClient.shutdown();
  }
};
