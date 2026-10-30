import { defineConfig, devices } from "@playwright/test";

// Runs against the local stack: `supabase start`, `pnpm env:local`, then `pnpm e2e`.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: { command: "pnpm dev", url: "http://localhost:3100", reuseExistingServer: true, timeout: 120_000 },
});
