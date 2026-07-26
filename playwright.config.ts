import { defineConfig } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'
const target = new URL(baseURL)
const isLocalTarget = target.hostname === 'localhost' || target.hostname === '127.0.0.1'

if (!isLocalTarget && (process.env.E2E_ENV !== 'staging' || process.env.E2E_STAGING_HOSTNAME !== target.hostname)) {
  throw new Error(
    'E2E remoto bloqueado: usa E2E_ENV=staging y E2E_STAGING_HOSTNAME coincidente; nunca ejecutes contra producción.',
  )
}

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  reporter: process.env.CI ? [['dot'], ['html', { open: 'never' }]] : [['list']],
})
