import Redis from "ioredis";
import { logger } from "./logger";

const STREAM_KEY = "devbrand:events";
const GROUP_NAME = "devbrand_workers";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export class DistributedEventBus {
  async init() {
    try {
      await redis.xgroup("CREATE", STREAM_KEY, GROUP_NAME, "$", "MKSTREAM");
      logger.info(`Consumer group ${GROUP_NAME} initialized for stream ${STREAM_KEY}`);
    } catch (err: any) {
      if (!err.message.includes("BUSYGROUP")) {
        logger.error(err, "Failed to initialize Redis Stream consumer group");
      }
    }
  }

  async publish(eventType: string, payload: Record<string, any>) {
    const id = await redis.xadd(
      STREAM_KEY,
      "*",
      "type",
      eventType,
      "payload",
      JSON.stringify(payload)
    );
    logger.debug({ eventType, id }, "Published event to distributed stream");
    return id;
  }

  async consume(consumerName: string, onEvent: (type: string, payload: any) => Promise<void>) {
    logger.info(`Consumer ${consumerName} started polling...`);
    
    while (true) {
      try {
        const results = await redis.xreadgroup(
          "GROUP",
          GROUP_NAME,
          consumerName,
          "COUNT",
          10,
          "BLOCK",
          5000,
          "STREAMS",
          STREAM_KEY,
          ">"
        );

        if (results && results.length > 0) {
          const stream = results[0];
          const messages = stream[1];

          for (const message of messages) {
            const messageId = message[0];
            const fields = message[1];
            
            let type = "";
            let payload = {};
            
            for (let i = 0; i < fields.length; i += 2) {
              if (fields[i] === "type") type = fields[i + 1];
              if (fields[i] === "payload") payload = JSON.parse(fields[i + 1]);
            }

            await onEvent(type, payload);
            
            // Acknowledge the message
            await redis.xack(STREAM_KEY, GROUP_NAME, messageId);
          }
        }
      } catch (err) {
        logger.error(err, "Error consuming from distributed event bus");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }
}

export const eventBus = new DistributedEventBus();
