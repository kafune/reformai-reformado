import { defineConfig } from "@playwright/test";

// Teste E2E do caminho feliz (PLAN.md Fase 10). Roda contra uma instância já no ar, com o seed
// aplicado (bun run db:seed) e o storage configurado. Ver e2e/README.md.
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    // Chromium já instalado (ex.: PLAYWRIGHT_BROWSERS_PATH); em CI use `bunx playwright install chromium`.
    launchOptions: process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : undefined,
  },
});
