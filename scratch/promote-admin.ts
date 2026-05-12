import { neon } from "@neondatabase/serverless";
import { env } from "../src/lib/env";

async function promoteAdmin() {
  const sql = neon(env.DATABASE_URL);
  
  try {
    console.log("Promoting 'bansalbhunesh' to admin...");
    const result = await sql`
      UPDATE users 
      SET role = 'admin' 
      WHERE github_login = 'bansalbhunesh'
      RETURNING *
    `;
    console.log("Result:", JSON.stringify(result, null, 2));
    console.log("Promotion successful!");
  } catch (e) {
    console.error("Promotion failed:", e);
  }
}

promoteAdmin();
