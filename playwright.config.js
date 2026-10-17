import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4175', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175',
    env: {
      VITE_EVENT_SLUG: 'test-event',
      VITE_LINK_ID: 'test-link',
      VITE_TURNSTILE_SITE_KEY: 'test-public-key',
      VITE_API_BASE: '/api/v1',
      VITE_SECRET_PAYLOAD: 'test-only-payload-key',
    },
    reuseExistingServer: false,
  },
})
