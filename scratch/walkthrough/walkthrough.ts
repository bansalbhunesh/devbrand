/**
 * Deployment walkthrough. Reads VERCEL_BYPASS_TOKEN + BASE_URL from env,
 * drives Chromium across the main routes, captures screenshots, logs HTTP
 * status / console errors / network failures. Output: scratch/walkthrough/*.png
 * plus a findings.json file with structured results.
 *
 * Run:
 *   $env:VERCEL_BYPASS_TOKEN="..."; $env:BASE_URL="https://devbrand-...vercel.app"; \
 *     npx tsx scratch/walkthrough/walkthrough.ts
 */
import { chromium, type Page, type ConsoleMessage } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL?.replace(/\/+$/, "");
const BYPASS = process.env.VERCEL_BYPASS_TOKEN;
const OUT_DIR = path.dirname(fileURLToPath(import.meta.url));

if (!BASE_URL) {
  console.error("Set BASE_URL");
  process.exit(2);
}

type RouteCheck = {
  name: string;
  path: string;
  /** Wait for either of these selectors before snapshotting; null = no wait. */
  expectSelector?: string;
  /** If true, expect a redirect to login or sign-in CTA. */
  requiresAuth?: boolean;
};

const ROUTES: RouteCheck[] = [
  { name: "01-landing", path: "/" },
  { name: "02-explore", path: "/explore" },
  { name: "03-dashboard", path: "/dashboard", requiresAuth: true },
  { name: "04-admin", path: "/admin", requiresAuth: true },
  { name: "05-roast", path: "/roast" },
  { name: "06-wrapped", path: "/wrapped", requiresAuth: true },
  { name: "07-referrals", path: "/referrals", requiresAuth: true },
];

type Finding = {
  route: string;
  url: string;
  status: number | null;
  consoleErrors: string[];
  consoleWarnings: string[];
  networkFailures: { url: string; status: number; method: string }[];
  loadMs: number;
  screenshot: string;
  notes: string[];
};

async function captureRoute(
  page: Page,
  route: RouteCheck,
): Promise<Finding> {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const networkFailures: Finding["networkFailures"] = [];

  const onConsole = (msg: ConsoleMessage) => {
    const t = msg.type();
    const txt = msg.text();
    if (t === "error") consoleErrors.push(txt);
    if (t === "warning") consoleWarnings.push(txt);
  };
  const onResp = (resp: Awaited<ReturnType<Page["goto"]>> | null) => {
    if (!resp) return;
    const s = resp.status();
    if (s >= 400 && s !== 401 && s !== 403) {
      networkFailures.push({
        url: resp.url(),
        status: s,
        method: resp.request().method(),
      });
    }
  };

  page.on("console", onConsole);
  page.on("response", onResp);

  const url = BASE_URL + route.path;
  const t0 = Date.now();
  let status: number | null = null;
  const notes: string[] = [];

  try {
    const resp = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    status = resp?.status() ?? null;
    if (resp && resp.status() === 401) notes.push("HTTP 401 from origin");
    if (resp && resp.status() === 403) notes.push("HTTP 403 from origin");
  } catch (e) {
    notes.push(`Goto failed: ${(e as Error).message}`);
  }

  // Best-effort wait for hydration; don't fail the whole walkthrough if it
  // never settles (some routes have animations that never go idle).
  try {
    await page.waitForLoadState("networkidle", { timeout: 8_000 });
  } catch {
    notes.push("networkidle timeout (8s)");
  }

  if (route.expectSelector) {
    try {
      await page.waitForSelector(route.expectSelector, { timeout: 5_000 });
    } catch {
      notes.push(`Expected selector not found: ${route.expectSelector}`);
    }
  }

  if (route.requiresAuth) {
    const finalUrl = page.url();
    // Any clear unauth state passes — routes use route-specific copy ("Command
    // Center restricted.", "Nothing to wrap.", "Sign in to invite.") rather
    // than a single canonical CTA. Match substring + a few keyword anchors.
    const body = await page.locator("body").innerText().catch(() => "");
    const hasFallback =
      /sign in|connect github|restricted|nothing to wrap|invite/i.test(body);
    if (!hasFallback && finalUrl === url) {
      notes.push(
        "Auth-gated route rendered without auth fallback and without redirect",
      );
    }
  }

  const screenshot = path.join(OUT_DIR, `${route.name}.png`);
  try {
    await page.screenshot({ path: screenshot, fullPage: true });
  } catch (e) {
    notes.push(`Screenshot failed: ${(e as Error).message}`);
  }

  page.off("console", onConsole);
  page.off("response", onResp);

  return {
    route: route.name,
    url,
    status,
    consoleErrors,
    consoleWarnings,
    networkFailures,
    loadMs: Date.now() - t0,
    screenshot: path.relative(process.cwd(), screenshot),
    notes,
  };
}

type Viewport = { label: string; width: number; height: number };
const VIEWPORTS: Viewport[] = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "mobile", width: 375, height: 667 },
];

async function runViewport(
  browser: import("playwright").Browser,
  viewport: Viewport,
): Promise<Finding[]> {
  const ctx = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });

  // Two ways past Vercel Deployment Protection:
  // - Dashboard-issued bypass token: VERCEL_BYPASS_TOKEN -> x-vercel-protection-bypass query
  //   plus x-vercel-set-bypass-cookie=true to plant the persistent _vercel_jwt cookie.
  // - "Share with others" link: VERCEL_SHARE_TOKEN -> _vercel_share query that sets a
  //   session cookie on first navigation.
  const SHARE = process.env.VERCEL_SHARE_TOKEN;
  if (BYPASS || SHARE) {
    const page = await ctx.newPage();
    const qs = BYPASS
      ? `x-vercel-protection-bypass=${BYPASS}&x-vercel-set-bypass-cookie=true`
      : `_vercel_share=${SHARE}`;
    const primer = `${BASE_URL}/?${qs}`;
    const resp = await page.goto(primer, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    console.log(
      `[bypass] mode=${BYPASS ? "token" : "share"} status=${resp?.status() ?? "?"} cookies=${(await ctx.cookies()).map((c) => c.name).join(",")}`,
    );
    await page.close();
  }

  const page = await ctx.newPage();
  const findings: Finding[] = [];
  for (const route of ROUTES) {
    const taggedName = `${viewport.label}-${route.name}`;
    console.log(`▶ [${viewport.label}] ${route.name} ${route.path}`);
    const f = await captureRoute(page, { ...route, name: taggedName });
    findings.push(f);
    const summary = [
      `status=${f.status}`,
      `t=${f.loadMs}ms`,
      `console-err=${f.consoleErrors.length}`,
      `net-fail=${f.networkFailures.length}`,
    ];
    if (f.notes.length) summary.push(`notes=${f.notes.length}`);
    console.log(`  ${summary.join("  ")}`);
  }
  await ctx.close();
  return findings;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const allFindings: Finding[] = [];
  for (const viewport of VIEWPORTS) {
    console.log(
      `\n┌─ Viewport: ${viewport.label} (${viewport.width}×${viewport.height}) ─┐`,
    );
    const findings = await runViewport(browser, viewport);
    allFindings.push(...findings);
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "findings.json"),
    JSON.stringify(allFindings, null, 2),
  );

  await browser.close();
  const findings = allFindings;

  // Print a compact triage section so it's readable without opening JSON.
  console.log("\n══════════ TRIAGE ══════════");
  for (const f of findings) {
    if (
      f.status !== 200 ||
      f.consoleErrors.length ||
      f.networkFailures.length ||
      f.notes.length
    ) {
      console.log(`\n• ${f.route} (${f.url})`);
      console.log(`  status: ${f.status}, ${f.loadMs}ms`);
      if (f.notes.length)
        f.notes.forEach((n) => console.log(`    note:    ${n}`));
      if (f.consoleErrors.length)
        f.consoleErrors
          .slice(0, 3)
          .forEach((e) => console.log(`    console: ${e.slice(0, 180)}`));
      if (f.networkFailures.length)
        f.networkFailures
          .slice(0, 3)
          .forEach((n) =>
            console.log(`    net:     ${n.status} ${n.method} ${n.url}`),
          );
    }
  }
  console.log("\nFull report: scratch/walkthrough/findings.json");
}

main().catch((e) => {
  console.error("Walkthrough failed:", e);
  process.exit(1);
});
