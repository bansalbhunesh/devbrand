/**
 * Offline-friendly smoke check: loads `.env` from cwd (never committed).
 * Usage: npm run llm:ping
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv(projectRoot: string): void {
  const p = resolve(projectRoot, ".env");
  if (!existsSync(p)) return;
  const lines = readFileSync(p, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

async function main() {
  loadDotEnv(process.cwd());
  process.env.LLM_PROVIDER ??= "openai_compatible";

  const { completeText } = await import("../src/server/llm/client");
  const out = await completeText({
    system: "Reply with the single word PONG.",
    user: "ping",
    maxTokens: 32,
    temperature: 0,
  });
  console.log(out.trim());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
