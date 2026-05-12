import { neon } from "@neondatabase/serverless";
import { env } from "../src/lib/env";

async function migrate() {
  const sql = neon(env.DATABASE_URL);
  
  try {
    console.log("Adding 'role' column to 'users'...");
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'`;
    
    console.log("Creating 'background_jobs' table...");
    await sql`
      CREATE TABLE IF NOT EXISTS background_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        payload JSONB,
        result JSONB,
        error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    
    console.log("Creating indexes...");
    await sql`CREATE INDEX IF NOT EXISTS jobs_user_idx ON background_jobs(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS jobs_status_idx ON background_jobs(status)`;
    
    console.log("Migration successful!");
  } catch (e) {
    console.error("Migration failed:", e);
  }
}

migrate();
