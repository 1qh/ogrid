import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  fullyParallel: false,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  reporter: [['list']],
  retries: 0,
  testDir: './tests',
  testMatch: /.*\.e2e\.ts$/u,
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3200',
    trace: 'off'
  },
  webServer: {
    command: 'bun next dev --turbo -p 3200',
    reuseExistingServer: true,
    timeout: 60_000,
    url: 'http://localhost:3200'
  },
  workers: 1
})
