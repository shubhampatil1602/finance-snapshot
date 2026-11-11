import { defineConfig, devices } from "@playwright/test"

/**
 * E2E runs against a production build and a separate database, so it never
 * touches real data. Run `pnpm build` first.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    timezoneId: "Asia/Kolkata",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm start --port 3100",
    url: "http://localhost:3100/login",
    reuseExistingServer: true,
    env: { MONGODB_DB: process.env.E2E_MONGODB_DB ?? "finance_snapshot_test" },
  },
})
