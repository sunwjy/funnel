import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  testMatch: "**/*.spec.ts",
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:5990",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm --filter @repo/e2e dev",
    port: 5990,
    reuseExistingServer: !process.env.CI,
  },
});
