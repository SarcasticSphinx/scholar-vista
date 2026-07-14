import path from "node:path";

import { defineConfig } from "vitest/config";

/**
 * Unit-test Vitest config.
 *
 * Resolves the project-wide `@/` path alias (mirrors `tsconfig.json`) so
 * component and library tests can import modules the same way the app does.
 * Individual test files opt into the jsdom environment with a
 * `// @vitest-environment jsdom` directive; the default `node` environment
 * is kept for pure-logic tests.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "**/*.integration.test.ts"],
  },
});
