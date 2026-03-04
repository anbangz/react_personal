import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:8080',
    browserName: 'chromium',
  },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  timeout: 15_000,
});
