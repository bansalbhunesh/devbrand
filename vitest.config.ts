import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./apps/web/src"),
      "@devbrand/ai-sdk": path.resolve(__dirname, "./packages/ai-sdk/index.ts"),
      "@devbrand/repo-intelligence": path.resolve(__dirname, "./packages/repo-intelligence/index.server.ts"),
      "@devbrand/config": path.resolve(__dirname, "./packages/config/env.ts"),
      "@devbrand/telemetry": path.resolve(__dirname, "./packages/telemetry/index.ts"),
      "@devbrand/openapi": path.resolve(__dirname, "./packages/openapi/schema.ts"),
      "@infrastructure": path.resolve(__dirname, "./infrastructure"),
      "@modules": path.resolve(__dirname, "./modules"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "packages/**/*.test.ts", "modules/**/*.test.ts"],
    exclude: ["node_modules", "dist", "e2e"],
  },
});
