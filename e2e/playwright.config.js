import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.js',
  timeout: 30000,
  retries: 1,
  // 单 worker 避免 localStorage 冲突
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 800 },
  },
})
