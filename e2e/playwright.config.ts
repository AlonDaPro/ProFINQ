import { defineConfig, devices } from '@playwright/test';

// Dedicated ports and database, so a test run never touches the dev servers or dev data.
const API_PORT = 4100;
// Not vite preview's default (4173): a preview left running against the dev API must never be reused.
const WEB_PORT = 4174;
const WEB_URL = `http://localhost:${WEB_PORT}`;
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? 'postgres://profiles:profiles@localhost:5432/profiles_e2e';
const SERVER_START_TIMEOUT_MS = 120_000;

export default defineConfig({
  testDir: './tests',
  // Every test resets the one shared database, so tests run one at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  // Both sides run their production builds: what is tested is what ships (including the CSP).
  webServer: [
    {
      command: 'npm run build && npm start',
      cwd: '../server',
      url: `http://localhost:${API_PORT}/api/health`,
      // The suite writes far faster than a person; the rate limit has its own server test.
      env: {
        PORT: String(API_PORT),
        DATABASE_URL,
        CORS_ORIGINS: WEB_URL,
        RATE_LIMIT_READS_PER_MINUTE: '100000',
        RATE_LIMIT_WRITES_PER_MINUTE: '100000',
      },
      timeout: SERVER_START_TIMEOUT_MS,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run build && npx vite preview --port ${WEB_PORT} --strictPort`,
      cwd: '../client',
      url: WEB_URL,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
      timeout: SERVER_START_TIMEOUT_MS,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
