import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: [['line'], ['json', { outputFile: '.test-artifacts/playwright-results.json' }]],
  use: {
    baseURL: process.env['WEB_E2E_BASE_URL'] ?? 'http://localhost:4200',
    browserName: 'chromium',
    launchOptions: {
      executablePath:
        process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE'] ??
        (existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined),
    },
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: 'mobile',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
});
