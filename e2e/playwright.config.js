import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.js',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 800 },
    // 为每个测试注入调试模式 localStorage
    storageState: undefined,
  },
  // 每个测试前清理 localStorage 并登录
  globalSetup: undefined,
})
