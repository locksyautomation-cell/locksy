import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 8_000 },

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    locale: "es-ES",
  },

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  projects: [
    // Global setup: logs in as each role and saves auth state
    {
      name: "setup",
      testMatch: "**/global.setup.ts",
    },

    // Test suites that reuse saved auth states
    {
      name: "auth-tests",
      testMatch: "**/auth/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "admin-tests",
      testMatch: "**/admin/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/auth-state/admin.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "dealer-tests",
      testMatch: "**/dealer/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/auth-state/dealer.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "client-tests",
      testMatch: "**/client/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/auth-state/client.json",
      },
      dependencies: ["setup"],
    },
  ],
});
