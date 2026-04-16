import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts"],
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/dist/**"],
    },
  },
});
