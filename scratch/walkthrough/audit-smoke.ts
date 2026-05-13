/**
 * Quick smoke for the copy audit changes:
 *  - new Autonomy section renders
 *  - Pricing tier list has the v2 features
 *  - no factual copy bugs remain
 */
import { chromium } from "playwright";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const OUT = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    document.getElementById("autonomy")?.scrollIntoView({ block: "start" });
    // Scroll past the py-32 top padding so the heading + 3-step grid are
    // actually in view. Reveal's whileInView fires inside the viewport
    // so we wait long enough for the staggered intro to finish.
    window.scrollBy({ top: 200, behavior: "instant" });
  });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(OUT, "audit-01-autonomy.png"), fullPage: false });

  await page.evaluate(() => {
    document.getElementById("pricing")?.scrollIntoView({ block: "start" });
    window.scrollBy({ top: 400, behavior: "instant" });
  });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(OUT, "audit-02-pricing.png"), fullPage: false });

  // Scan all page text for the strings we fixed
  const text = await page.evaluate(() => document.body.innerText);
  const checks: Array<[string, boolean]> = [
    ["7-layer absent", !/7-layer/i.test(text)],
    ["Wrapped 2025 absent", !/Wrapped 2025/.test(text)],
    ["AI Personas absent", !/AI Personas/.test(text)],
    ["Personal AI Career Coach absent", !/Personal AI Career Coach/.test(text)],
    ["Neural Parse absent", !/Neural Parse/.test(text)],
    ["8-layer present", /8-layer/i.test(text)],
    ["Autonomy header present", /Stop pasting PR URLs|DevBrand watches your repos/.test(text)],
    ["Watch repos pricing present", /Watch repos/.test(text)],
    ["Twitter thread pricing present", /Twitter.X thread/i.test(text)],
    ["Voice memory pricing present", /Voice [Mm]emory/.test(text)],
  ];
  console.log("\n=== copy audit verification ===");
  for (const [name, ok] of checks) console.log(`  ${ok ? "✓" : "✗"} ${name}`);

  if (errs.length) {
    console.log(`\n✗ ${errs.length} console errors`);
    errs.slice(0, 5).forEach((e) => console.log(`  ${e.slice(0, 220)}`));
  } else {
    console.log("\n✓ zero console errors");
  }

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
