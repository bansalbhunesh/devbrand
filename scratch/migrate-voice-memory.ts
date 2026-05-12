/**
 * Adds user_post_edits table + users.voice_learning_enabled column.
 * Idempotent.
 * Run:  npx tsx scratch/migrate-voice-memory.ts
 */
import { Pool } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(2);
}

const STATEMENTS: { label: string; sql: string }[] = [
  {
    label: "users.voice_learning_enabled — ADD COLUMN",
    sql: `ALTER TABLE "users"
            ADD COLUMN IF NOT EXISTS "voice_learning_enabled" BOOLEAN NOT NULL DEFAULT true;`,
  },
  {
    label: "user_post_edits — CREATE TABLE",
    sql: `CREATE TABLE IF NOT EXISTS "user_post_edits" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
            "output_id" UUID NOT NULL REFERENCES "outputs"("id") ON DELETE CASCADE,
            "post_kind" TEXT NOT NULL,
            "edited_text" TEXT NOT NULL,
            "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
          );`,
  },
  {
    label: "user_post_edits.user_id — INDEX",
    sql: `CREATE INDEX IF NOT EXISTS "user_post_edits_user_idx"
            ON "user_post_edits" ("user_id");`,
  },
  {
    label: "user_post_edits.(user_id, created_at) — INDEX",
    sql: `CREATE INDEX IF NOT EXISTS "user_post_edits_user_created_idx"
            ON "user_post_edits" ("user_id", "created_at");`,
  },
];

async function main() {
  const pool = new Pool({ connectionString: url });
  try {
    for (const stmt of STATEMENTS) {
      console.log(`→ ${stmt.label}`);
      await pool.query(stmt.sql);
      console.log(`  ✓ done`);
    }

    const verify = await pool.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name
         FROM information_schema.columns
        WHERE table_schema='public'
          AND (
            (table_name='users' AND column_name='voice_learning_enabled')
            OR table_name='user_post_edits'
          )
        ORDER BY table_name, ordinal_position;`,
    );
    for (const row of verify.rows) {
      console.log(`  ${row.table_name}.${row.column_name}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
