/**
 * Diagnostic: probe the shader canvas. Confirms it's positioned + sized
 * correctly, samples its pixels at three spots, and prints the average
 * RGB so we can tell whether the shader is actually painting colour or
 * just black. Headless Playwright uses SwiftShader (software WebGL)
 * which often looks dimmer than hardware-accelerated Chrome, so a
 * software pixel of e.g. (40, 30, 90) might display vivid in a real
 * browser.
 */
import { chromium } from "playwright";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("section canvas", { timeout: 10000 });
  // Allow shader to animate 3s so noise field warms
  await page.waitForTimeout(3000);

  const probe = await page.evaluate(() => {
    const allCanvases = Array.from(document.querySelectorAll("canvas"));
    const sectionRect = document
      .querySelector("section")
      ?.getBoundingClientRect();
    const canvases = allCanvases.map((c) => {
      const r = c.getBoundingClientRect();
      return {
        cls: c.className,
        rect: { w: r.width, h: r.height, top: r.top },
        buf: { w: c.width, h: c.height },
        parentCls:
          (c.parentElement as HTMLElement | null)?.className?.slice(0, 60) ??
          null,
      };
    });
    const canvas = allCanvases[0] ?? null;
    if (!canvas)
      return {
        ok: false,
        reason: "no canvas",
        section: sectionRect,
        canvases,
      };
    const rect = canvas.getBoundingClientRect();
    const samples: Array<{ x: number; y: number; rgb: number[] }> = [];
    // Render canvas to an offscreen 2D canvas so we can readPixels
    // independent of WebGL preservedDrawingBuffer.
    const off = document.createElement("canvas");
    off.width = canvas.width;
    off.height = canvas.height;
    const offCtx = off.getContext("2d")!;
    offCtx.drawImage(canvas, 0, 0);
    const points = [
      [canvas.width * 0.5, canvas.height * 0.5],
      [canvas.width * 0.25, canvas.height * 0.5],
      [canvas.width * 0.75, canvas.height * 0.5],
      [canvas.width * 0.5, canvas.height * 0.25],
      [canvas.width * 0.5, canvas.height * 0.75],
    ];
    for (const [x, y] of points) {
      const d = offCtx.getImageData(x, y, 1, 1).data;
      samples.push({ x, y, rgb: [d[0], d[1], d[2]] });
    }
    return {
      ok: true,
      section: sectionRect,
      canvases,
      rect: { w: rect.width, h: rect.height, top: rect.top, left: rect.left },
      drawingBuffer: { w: canvas.width, h: canvas.height },
      samples,
    };
  });
  console.log(JSON.stringify(probe, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
