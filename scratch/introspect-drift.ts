/**
 * Read-only schema introspection — compares the live Neon schema to
 * schema.server.ts and reports drift (columns in DB but not in code,
 * and vice-versa). Does not modify the database.
 *
 * Run:  npx tsx scratch/introspect-drift.ts
 */
import { Pool } from "@neondatabase/serverless";
import {
  users,
  profiles,
  outputs,
  repoGraphs,
  userEvents,
  teams,
  teamMembers,
  reputationHistory,
  subscriptions,
  roasts,
  backgroundJobs,
} from "../src/server/schema.server";
import { getTableConfig } from "drizzle-orm/pg-core";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(2);
}

const CODE_TABLES = [
  users,
  profiles,
  outputs,
  repoGraphs,
  userEvents,
  teams,
  teamMembers,
  reputationHistory,
  subscriptions,
  roasts,
  backgroundJobs,
];

async function main() {
  const pool = new Pool({ connectionString: url });
  try {
    const liveTables = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name;`,
    );
    const liveTableNames = new Set(liveTables.rows.map((r) => r.table_name));
    const codeTableNames = new Set(
      CODE_TABLES.map((t) => getTableConfig(t).name),
    );

    console.log("=== TABLES ===");
    console.log("Code:", [...codeTableNames].sort().join(", "));
    console.log("Live:", [...liveTableNames].sort().join(", "));

    const tablesInDbNotCode = [...liveTableNames].filter(
      (n) => !codeTableNames.has(n),
    );
    const tablesInCodeNotDb = [...codeTableNames].filter(
      (n) => !liveTableNames.has(n),
    );
    if (tablesInDbNotCode.length) {
      console.log("⚠ Tables in DB but not in code:", tablesInDbNotCode);
    }
    if (tablesInCodeNotDb.length) {
      console.log("⚠ Tables in code but not in DB:", tablesInCodeNotDb);
    }

    console.log("\n=== COLUMNS BY TABLE ===");
    for (const table of CODE_TABLES) {
      const cfg = getTableConfig(table);
      const tableName = cfg.name;
      if (!liveTableNames.has(tableName)) {
        console.log(`\n[${tableName}] MISSING IN DB`);
        continue;
      }
      const codeCols = new Map(cfg.columns.map((c) => [c.name, c]));
      const liveCols = await pool.query<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position;`,
        [tableName],
      );
      const liveColMap = new Map(liveCols.rows.map((r) => [r.column_name, r]));

      const inDbNotCode = [...liveColMap.keys()].filter(
        (k) => !codeCols.has(k),
      );
      const inCodeNotDb = [...codeCols.keys()].filter(
        (k) => !liveColMap.has(k),
      );

      if (inDbNotCode.length === 0 && inCodeNotDb.length === 0) {
        console.log(`[${tableName}] ✓ in sync (${liveColMap.size} cols)`);
      } else {
        console.log(`[${tableName}] DRIFT`);
        if (inDbNotCode.length) {
          console.log("  DB-only columns (code missing):");
          for (const c of inDbNotCode) {
            const live = liveColMap.get(c)!;
            console.log(
              `    + ${c} (${live.data_type}, nullable=${live.is_nullable}, default=${live.column_default ?? "—"})`,
            );
          }
        }
        if (inCodeNotDb.length) {
          console.log("  Code-only columns (DB missing):");
          for (const c of inCodeNotDb) {
            console.log(`    - ${c}`);
          }
        }
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Introspection failed:", e);
  process.exit(1);
});
