/**
 * Tier 2 visual smoke. Loads the landing, waits for the shader chunk +
 * the shader's first frame, captures console errors, screenshots.
 * Then navigates to /explore and back to / to exercise the new
 * scale+blur page transition — we don't measure motion (headless) but
 * we verify no console errors fire during the transition.
 *
 * Run:  BASE_URL=http://localhost:3000 npx tsx scratch/walkthrough/tier2-smoke.ts
 */
import { chromium } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);
const OUT = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();

  const errs: string[] = [];
  const webglFailures: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errs.push(m.text());
    if (m.type() === "warning" && /webgl/i.test(m.text())) {
      webglFailures.push(m.text());
    }
  });

  console.log("→ landing (shader)");
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  // Wait until the HeroBackdrop's canvas is in the DOM. The shader chunk
  // is lazy so this confirms the chunk loaded and R3F mounted.
  await page
    .waitForSelector("section canvas", { timeout: 8000, state: "attached" })
    .catch(() => console.log("  ✗ Hero canvas never mounted"));
  await page
    .waitForLoadState("networkidle", { timeout: 6000 })
    .catch(() => {});
  await page.screenshot({
    path: path.join(OUT, "tier2-01-landing-shader.png"),
    fullPage: false,
  });

  // Page transition: / -> /explore -> /
  console.log("→ transition / → /explore");
  await page.goto(`${BASE}/explore`, { waitUntil: "domcontentloaded" });
  await page
    .waitForLoadState("networkidle", { timeout: 6000 })
    .catch(() => {});
  await page.screenshot({
    path: path.join(OUT, "tier2-02-explore.png"),
    fullPage: false,
  });

  console.log("→ transition /explore → /");
  await page.goBack({ waitUntil: "domcontentloaded" });
  await page
    .waitForLoadState("networkidle", { timeout: 6000 })
    .catch(() => {});
  await page.screenshot({
    path: path.join(OUT, "tier2-03-back-landing.png"),
    fullPage: false,
  });

  fs.writeFileSync(
    path.join(OUT, "tier2-findings.json"),
    JSON.stringify(
      { consoleErrors: errs, webglWarnings: webglFailures, base: BASE },
      null,
      2,
    ),
  );

  if (errs.length) {
    console.log(`✗ ${errs.length} console errors:`);
    errs.slice(0, 8).forEach((e) => console.log(`  ${e.slice(0, 220)}`));
  } else {
    console.log("✓ zero console errors across landing + 2 transitions");
  }
  if (webglFailures.length) {
    console.log(`⚠ ${webglFailures.length} WebGL warnings:`);
    webglFailures.slice(0, 3).forEach((e) => console.log(`  ${e.slice(0, 220)}`));
  }

  await browser.close();
}

main().catch((e) => {
  console.error("tier2 smoke failed:", e);
  process.exit(1);
});
