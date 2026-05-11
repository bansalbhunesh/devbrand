import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
import { env } from "../lib/env";

// Enable connection pooling for serverless environments
neonConfig.fetchConnectionCache = true;

/**
 * Lazy database client initialization.
 * This prevents crashes if the database URL is missing during the initial script evaluation
 * and allows the environment to be polyfilled before connection.
 */
function createDb() {
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn("⚠️ DATABASE_URL is not set. Database operations will fail.");
    // We return a proxy that throws on any access to provide clear error messages
    return new Proxy({} as any, {
      get() {
        throw new Error(
          "Database client accessed before DATABASE_URL was initialized.",
        );
      },
    });
  }

  const pool = new Pool({ connectionString: databaseUrl });
  return drizzle(pool, { schema });
}

// Export a proxy that initializes the database on first access
export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(target, prop, receiver) {
    if (!(target as any)._initialized) {
      const client = createDb();
      Object.assign(target, client);
      (target as any)._initialized = true;
    }
    return Reflect.get(target, prop, receiver);
  },
});
