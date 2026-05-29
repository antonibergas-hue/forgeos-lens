import { defineConfig, devices } from "@playwright/test";

// Drives the Vite dev URL directly. window.__TAURI_INTERNALS__ is undefined
// in a plain browser, so forgeos.ts routes shell-outs to forgeos.fixtures.ts.
// This lets the smoke harness run anywhere (laptop, tester pod, CI) without
// pulling in xvfb / tauri-driver / WebKitWebDriver.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // serialise — single dev server, screenshot stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  outputDir: "test-results",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
