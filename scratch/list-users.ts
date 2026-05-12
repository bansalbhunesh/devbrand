import { neon } from "@neondatabase/serverless";
import { env } from "../src/lib/env";

async function listUsers() {
  try {
    const sql = neon(env.DATABASE_URL);
    const allUsers = await sql`SELECT * FROM users`;
    console.log(JSON.stringify(allUsers, null, 2));
  } catch (e) {
    console.error("Failed to list users:", e);
  }
}

listUsers();
