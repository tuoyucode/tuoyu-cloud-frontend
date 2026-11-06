import process from 'node:process';

import { defineConfig, devices } from 'playwright/test';

/**
 * 端到端测试（Playwright）。需要真实的后端，见 e2e/support.ts 中的环境变量说明：
 * - 默认启动本地开发服务器（http://localhost:5666），/api 转发到 VITE_DEV_PROXY_TARGET（默认 http://localhost:8081，后端网关）；
 * - 设置 E2E_BASE_URL 时测试已经部署好的前端，不启动开发服务器；
 * - 没有后端或没有提供账号时测试会被跳过并写明原因；E2E_REQUIRE_BACKEND=true 时改为失败。
 */
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5666';
const startDevServer = !process.env.E2E_BASE_URL;

export default defineConfig({
  forbidOnly: !!process.env.CI,
  fullyParallel: false,
  outputDir: './e2e/.output/test-results',
  reporter: process.env.CI
    ? [
        ['list'],
        ['html', { open: 'never', outputFolder: './e2e/.output/report' }],
      ]
    : [['list']],
  retries: process.env.CI ? 1 : 0,
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL,
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // 登录、增删改查共用一个账号，按顺序执行
  workers: 1,
  webServer: startDevServer
    ? {
        command: 'pnpm run dev',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        url: baseURL,
      }
    : undefined,
});
