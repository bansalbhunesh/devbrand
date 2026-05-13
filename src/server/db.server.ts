import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema.server";
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
    return new Proxy({} as any, {
      get() {
        throw new Error(
          "Database client accessed before DATABASE_URL was initialized.",
        );
      },
    });
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10000, // 10s timeout
    max: 1, // Minimize connections in serverless to avoid exhaustion
  });

  return drizzle(pool, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_, prop) {
    if (!_db) {
      _db = createDb();
    }
    return (
      (
        Object.getOwnPropertyDescriptor(_db, prop)?.value || (_db as any)[prop]
      )?.bind?.(_db) || (_db as any)[prop]
    );
  },
});
