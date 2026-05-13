import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [// TanStack Start v1.167 has no Vercel adapter — `preset: "vercel"` here
  // was decorative and silently ignored, producing a plain Node ESM bundle
  // at dist/server/server.js that Vercel didn't know how to invoke.
  // Vercel wiring is now explicit via api/index.ts + vercel.json rewrites.
  tanstackStart(), react(), tailwindcss(), tsconfigPaths(), cloudflare({
    viteEnvironment: {
      name: "ssr"
    }
  })],
  server: {
    // Pin dev port so Playwright's webServer healthcheck (localhost:3000)
    // hits a deterministic target. Vite's default 5173 was getting squatted
    // by stale dev processes and hopping to 5176, leaving the e2e suite to
    // time out waiting on 3000.
    port: 3000,
  },
  build: {
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: [
          "console.log",
          "console.info",
          "console.debug",
          "console.trace",
        ],
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});