/**
 * Tier 3 visual smoke. Captures:
 *   - landing hero (kinetic headline lives here; static screenshot can't
 *     show velocity but verifies the H1 still renders)
 *   - landing demo section at top (BEFORE-dominant state)
 *   - landing demo section scrolled mid (transformation moment)
 *   - landing demo section scrolled past (AFTER-dominant state)
 * Plus checks console errors across the full scroll.
 *
 * Run: BASE_URL=http://localhost:3000 npx tsx scratch/walkthrough/tier3-smoke.ts
 */
import { chromium } from "playwright";
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
  page.on("console", (m) => {
    if (m.type() === "error") errs.push(m.text());
  });

  console.log("→ landing top (hero with kinetic headline)");
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("section canvas", { timeout: 10000 });
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: path.join(OUT, "tier3-01-hero.png"),
    fullPage: false,
  });

  console.log("→ demo section enter");
  await page.evaluate(() =>
    document.getElementById("demo")?.scrollIntoView({ block: "start" }),
  );
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: path.join(OUT, "tier3-02-demo-enter.png"),
    fullPage: false,
  });

  console.log("→ demo section mid (transformation)");
  await page.evaluate(() => {
    const demo = document.getElementById("demo");
    if (!demo) return;
    const r = demo.getBoundingClientRect();
    window.scrollBy({ top: r.height * 0.35, behavior: "instant" });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(OUT, "tier3-03-demo-mid.png"),
    fullPage: false,
  });

  console.log("→ demo section after");
  await page.evaluate(() => {
    window.scrollBy({ top: 700, behavior: "instant" });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(OUT, "tier3-04-demo-after.png"),
    fullPage: false,
  });

  if (errs.length) {
    console.log(`✗ ${errs.length} console errors:`);
    errs.slice(0, 6).forEach((e) => console.log(`  ${e.slice(0, 220)}`));
  } else {
    console.log("✓ zero console errors across landing scroll");
  }

  await browser.close();
}

main().catch((e) => {
  console.error("tier3 smoke failed:", e);
  process.exit(1);
});
