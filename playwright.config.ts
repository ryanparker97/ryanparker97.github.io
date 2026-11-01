import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const MOBILE = /mobile\.spec\.ts$/;

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [
        ['html', { open: 'never' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['github'],
      ]
    : 'list',
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: MOBILE },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: MOBILE },
    // Phone checks (spec §5.13, §5.15) run on real device profiles, WebKit and Chromium.
    { name: 'iphone-13', use: { ...devices['iPhone 13'] }, testMatch: MOBILE },
    { name: 'pixel-7', use: { ...devices['Pixel 7'] }, testMatch: MOBILE },
  ],
  // Serves the built site (run `pnpm build` first).
  webServer: {
    command: `tsx scripts/static-server.ts dist ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
