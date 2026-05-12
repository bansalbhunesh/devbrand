import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: false,
    environment: "node",
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "tests/e2e/**",
      "e2e/**",
      // Agent worktrees live under .claude/worktrees/ and re-include the
      // whole repo. Without this exclusion vitest scans them and tries to
      // run their Playwright e2e specs as unit tests.
      ".claude/worktrees/**",
    ],
  },
});
