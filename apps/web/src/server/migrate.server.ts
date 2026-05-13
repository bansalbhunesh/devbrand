import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

async function migrate() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const sqlFile = path.resolve(process.cwd(), "schema.sql");
  const sqlContent = fs.readFileSync(sqlFile, "utf8");

  console.log("Connecting to database...");
  const sql = neon(process.env.DATABASE_URL);

  console.log("Cleaning existing tables...");
  const tables = [
    "users",
    "outputs",
    "roasts",
    "profiles",
    "repo_graphs",
    "user_events",
    "subscriptions",
    "team_members",
    "teams",
    "reputation_history",
  ];
  for (const table of tables) {
    try {
      await (sql as any).query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    } catch (err) {
      /* ignore if table doesn't exist */
    }
  }

  console.log("Executing schema.sql...");
  // Split by semicolon but handle potential issues with JSON or text
  // For simplicity, we'll try to run the whole thing or split by a simple regex
  const statements = sqlContent.split(";").filter((s) => s.trim().length > 0);

  for (const statement of statements) {
    try {
      await (sql as any).query(statement);
    } catch (err) {
      console.error(
        `Error executing statement: ${statement.substring(0, 50)}...`,
      );
      console.error(err);
      // Continue if it's "table already exists" error (42P07)
    }
  }

  console.log("Migration complete.");
}

migrate().catch(console.error);
