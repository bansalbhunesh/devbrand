import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    // TanStack Start v1.167 has no Vercel adapter — `preset: "vercel"` here
    // was decorative and silently ignored, producing a plain Node ESM bundle
    // at dist/server/server.js that Vercel didn't know how to invoke.
    // Vercel wiring is now explicit via api/index.ts + vercel.json rewrites.
    tanstackStart(),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
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
