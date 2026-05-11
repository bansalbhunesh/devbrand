import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let _db: any = null;

export function getDb() {
  if (_db) return _db;
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const sql = neon(process.env.DATABASE_URL);
  _db = drizzle(sql, { schema });
  return _db;
}

// Keep the export for backward compatibility but it will now throw if called before env is polyfilled
// Alternatively, we should update callers to use getDb()
export const db = new Proxy({} as any, {
  get(target, prop) {
    return getDb()[prop];
  }
});
