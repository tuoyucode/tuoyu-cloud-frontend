import type { APIRequestContext, Page, TestInfo } from 'playwright/test';

import process from 'node:process';

import { expect } from 'playwright/test';

/**
 * 端到端测试的环境变量（都不是必填；账号口令不写入仓库，只从环境变量读取）：
 * - E2E_BASE_URL：要测试的前端地址；不设置时启动本地开发服务器 http://localhost:5666
 * - E2E_API_URL：后端接口地址（经网关），默认为 <E2E_BASE_URL>/api，用于测试前确认后端可用
 * - E2E_ROUTER_HISTORY：前端路由模式，开发服务器为 history（默认），生产构建为 hash
 * - E2E_USERNAME、E2E_PASSWORD：登录账号；没有提供时跳过需要登录的测试
 * - E2E_REQUIRE_BACKEND=true：后端不可用或缺少账号时让测试失败而不是跳过（CI 中手动触发时使用）
 * - VITE_DEV_PROXY_TARGET：本地开发服务器把 /api 转发到的后端网关，默认 http://localhost:8081
 */
export const env = {
  apiURL:
    process.env.E2E_API_URL ||
    `${(process.env.E2E_BASE_URL || 'http://localhost:5666').replace(/\/+$/, '')}/api`,
  hashRouter: process.env.E2E_ROUTER_HISTORY === 'hash',
  password: process.env.E2E_PASSWORD || '',
  requireBackend: process.env.E2E_REQUIRE_BACKEND === 'true',
  username: process.env.E2E_USERNAME || '',
};

/** 后端的接口加密状态（/auth/crypto/public-key） */
export interface BackendInfo {
  cryptoEnabled: boolean;
}

/** 前端路由地址：hash 模式下加 #/ */
export function appPath(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return env.hashRouter ? `/#${normalized}` : normalized;
}

/**
 * 跳过或失败：默认跳过并写明原因；要求后端时直接失败，避免“全部跳过”被当成通过
 */
function skipOrFail(testInfo: TestInfo, reason: string) {
  if (env.requireBackend) {
    throw new Error(`[e2e] ${reason}`);
  }
  // 列表报告不显示跳过原因，输出到标准错误，避免“跳过”被误认为通过
  process.stderr.write(`[e2e] 跳过“${testInfo.titlePath.join(' › ')}”：${reason}
`);
  testInfo.skip(true, reason);
}

/**
 * 确认后端可用：请求不需要登录的公钥接口。不可用时跳过（或失败）
 */
export async function requireBackend(
  request: APIRequestContext,
  testInfo: TestInfo,
): Promise<BackendInfo> {
  const url = `${env.apiURL}/auth/crypto/public-key`;
  let body: any;
  try {
    const response = await request.get(url, { timeout: 5000 });
    body = await response.json();
  } catch (error) {
    skipOrFail(
      testInfo,
      `后端不可用：无法访问 ${url}（${(error as Error).message.split('\n')[0]}）。请先启动后端网关与 system、auth 服务，或用 E2E_API_URL 指定地址`,
    );
    return { cryptoEnabled: false };
  }
  if (body?.code !== 200) {
    skipOrFail(testInfo, `后端返回异常：${url} → ${JSON.stringify(body)}`);
  }
  return { cryptoEnabled: !!body?.data?.enabled };
}

/** 确认提供了登录账号 */
export function requireCredentials(testInfo: TestInfo) {
  if (!env.username || !env.password) {
    skipOrFail(
      testInfo,
      '没有提供登录账号：请设置环境变量 E2E_USERNAME 与 E2E_PASSWORD（不要写入仓库）',
    );
  }
}

/**
 * 在登录页登录。后端开启了图形验证码时无法自动登录，跳过（或失败）
 */
export async function login(page: Page, testInfo: TestInfo) {
  await page.goto(appPath('/auth/login'));
  const username = page.getByPlaceholder('请输入用户名');
  await expect(username).toBeVisible();

  // 等验证码接口返回后再判断是否显示验证码
  await page.waitForLoadState('networkidle');
  if (await page.getByPlaceholder('请输入验证码').isVisible()) {
    skipOrFail(
      testInfo,
      '后端开启了登录图形验证码，端到端测试无法自动登录。请在测试环境关闭 security.captcha.enabled（仅限测试环境）',
    );
  }

  // 开启多租户时选择租户（默认选中记住的或唯一的租户）
  const tenant = page.getByPlaceholder('请选择租户');
  if (await tenant.isVisible()) {
    await tenant.click();
    await page.getByRole('option').first().click();
  }

  await username.fill(env.username);
  await page.getByPlaceholder('密码').fill(env.password);
  await page.getByRole('button', { name: /登\s*录/ }).click();
}

/** 等待操作结果提示，例如“已保存” */
export async function expectToast(page: Page, text: string) {
  await expect(
    page.locator('.ant-message-notice').filter({ hasText: text }).first(),
  ).toBeVisible();
}
