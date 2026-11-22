import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
      // `server-only` throws outside React Server Components; tests run in Node.
      "server-only": path.resolve(import.meta.dirname, "test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
