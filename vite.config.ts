// Triggering fresh build for Cloudflare resolution
// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        "@tanstack/react-start/api": "@tanstack/react-start",
      },
    },
    build: {
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          passes: 2,
        },
        mangle: {
          safari10: true,
        },
        format: {
          comments: false,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              if (id.includes("react")) return "vendor-react";
              if (id.includes("@tanstack")) return "vendor-tanstack";
              if (id.includes("@radix-ui")) return "vendor-radix";
              if (id.includes("framer-motion")) return "vendor-framer";
              if (
                id.includes("clsx") ||
                id.includes("tailwind-merge") ||
                id.includes("class-variance-authority")
              )
                return "vendor-utils";
              return "vendor";
            }
          },
        },
      },
      chunkSizeWarningLimit: 600,
      reportCompressedSize: true,
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "@tanstack/react-router",
        "@tanstack/react-query",
        "@tanstack/react-start",
        "framer-motion",
      ],
    },
  },
});
