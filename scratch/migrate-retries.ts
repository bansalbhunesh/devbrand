import { neon } from "@neondatabase/serverless";

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    await sql`ALTER TABLE background_jobs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0`;
    await sql`ALTER TABLE background_jobs ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3`;
    console.log("Migration successful");
  } catch (e) {
    console.error("Migration failed:", e);
  }
}

migrate();
