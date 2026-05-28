import fs from 'fs';
import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_uc4VGgdQoLF5@ep-wandering-cherry-apemuzvq-pooler.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require');

async function run() {
  try {
    const schemaSql = fs.readFileSync('schema.sql', 'utf8');
    console.log('Running schema.sql...');
    // postgres.js handles multiple statements nicely via unsafe
    await sql.unsafe(schemaSql);
    console.log('Successfully applied schema.sql!');
  } catch (err) {
    console.error('Error applying schema:', err);
  } finally {
    await sql.end();
  }
}

run();
