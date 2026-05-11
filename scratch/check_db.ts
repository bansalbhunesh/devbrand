import { db } from "../src/server/db";
import { outputs } from "../src/server/schema";
import { sql } from "drizzle-orm";

async function check() {
  const count = await db.select({ count: sql`count(*)` }).from(outputs);
  console.log("Output Count:", count[0].count);
  process.exit(0);
}

check().catch((err) => {
  console.error(err);
  process.exit(1);
});
