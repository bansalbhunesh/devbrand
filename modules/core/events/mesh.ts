import { z } from "zod";
import { logger, trace } from "@devbrand/telemetry";

/**
 * ELITE ARCHITECTURE: The Event Bus (Operational).
 * This version includes retry semantics, DLQ routing, and telemetry.
 */

export const EventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("repo.registered"),
    payload: z.object({
      repoId: z.string(),
      userId: z.string(),
      url: z.string(),
    }),
  }),
  z.object({
    type: z.literal("repo.synced"),
    payload: z.object({ repoId: z.string(), branch: z.string() }),
  }),
  z.object({
    type: z.literal("analysis.started"),
    payload: z.object({ jobId: z.string(), repoId: z.string() }),
  }),
  z.object({
    type: z.literal("analysis.completed"),
    payload: z.object({ jobId: z.string(), outputId: z.string() }),
  }),
  z.object({
    type: z.literal("workflow.state_changed"),
    payload: z.object({
      workflowId: z.string(),
      from: z.string(),
      to: z.string(),
    }),
  }),
  z.object({
    type: z.literal("REPO_INGESTION_REQUESTED"),
    payload: z.object({
      url: z.string(),
      userId: z.string(),
      priority: z.enum(["low", "high"]),
      timestamp: z.number(),
    }),
  }),
]);


export type PlatformEvent = z.infer<typeof EventSchema>;

type Handler<T extends PlatformEvent["type"]> = (
  payload: Extract<PlatformEvent, { type: T }>["payload"],
) => Promise<void> | void;

export class EventBus {
  private static instance: EventBus;
  private handlers: Map<string, Set<Handler<any>>> = new Map();
  private maxRetries = 3;

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  on<T extends PlatformEvent["type"]>(type: T, handler: Handler<T>) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  async emit(event: PlatformEvent) {
    await trace(`event.emit:${event.type}`, async (span) => {
      const result = EventSchema.safeParse(event);
      if (!result.success) {
        logger.error("Invalid event emitted", { error: result.error });
        return;
      }

      const handlers = this.handlers.get(event.type);
      if (!handlers) return;

      const promises = Array.from(handlers).map((h) =>
        this.executeWithRetry(event, h),
      );
      await Promise.all(promises);
    });
  }

  private async executeWithRetry(
    event: PlatformEvent,
    handler: Handler<any>,
    attempt = 1,
  ) {
    try {
      // Since we've validated the event type at runtime, we can safely invoke the handler
      await (handler as any)(event.payload);
    } catch (err) {
      if (attempt < this.maxRetries) {
        const delay = Math.pow(2, attempt) * 100;
        logger.warn(
          `Handler for ${event.type} failed. Retrying in ${delay}ms...`,
          { attempt },
        );
        await new Promise((r) => setTimeout(r, delay));
        return this.executeWithRetry(event, handler, attempt + 1);
      } else {
        logger.error(
          `Handler for ${event.type} terminals failed. Routing to DLQ.`,
          { event },
        );
        await this.routeToDLQ(event, err as Error);
      }
    }
  }

  private async routeToDLQ(event: PlatformEvent, err: Error) {
    // In production, this would persist to a 'dead_letter_events' table
    logger.error("DLQ: Event isolated", {
      type: event.type,
      error: err.message,
    });
  }
}

export const mesh = EventBus.getInstance();
