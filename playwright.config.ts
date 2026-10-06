import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-360", use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 800 } } },
  ],
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://127.0.0.1:3100", reuseExistingServer: false, timeout: 120_000,
    // Even a forgotten route mock cannot reach a paid API with a local key.
    env: { STORY_E2E: "1", AI_PROVIDER: "gemini", GEMINI_API_KEY: "", GOOGLE_API_KEY: "", OPENAI_API_KEY: "", NEXT_TELEMETRY_DISABLED: "1" },
  },
});
