export type DomainEvent =
  | {
      type: "TRANSFORM_STARTED";
      payload: { userId: string; prUrl: string; jobId: string };
    }
  | {
      type: "TRANSFORM_COMPLETED";
      payload: { userId: string; outputId: string; slug: string };
    }
  | {
      type: "TRANSFORM_FAILED";
      payload: { userId: string; prUrl: string; error: string };
    }
  | { type: "ROAST_GENERATED"; payload: { userId: string; roastId: string } }
  | {
      type: "POST_SCHEDULED";
      payload: { userId: string; scheduledPostId: string; channel: string };
    };

type Handler<T extends DomainEvent["type"]> = (
  event: Extract<DomainEvent, { type: T }>,
) => Promise<void>;

export class EventBus {
  private static instance: EventBus;
  private handlers: Map<string, Handler<any>[]> = new Map();

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) EventBus.instance = new EventBus();
    return EventBus.instance;
  }

  on<T extends DomainEvent["type"]>(type: T, handler: Handler<T>): void {
    const existing = this.handlers.get(type) || [];
    this.handlers.set(type, [...existing, handler]);
  }

  async emit(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    console.log(`[EventBus] Emitting ${event.type}`, event.payload);

    // Run handlers in background (standard for events)
    handlers.forEach((h) => {
      h(event).catch((err) => {
        console.error(`[EventBus] Error in handler for ${event.type}:`, err);
      });
    });
  }
}
