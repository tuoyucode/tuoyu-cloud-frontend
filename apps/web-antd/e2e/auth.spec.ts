import type { BackendInfo } from './support';

import { expect, test } from 'playwright/test';

import {
  appPath,
  env,
  login,
  requireBackend,
  requireCredentials,
} from './support';

/**
 * 登录（按后端的接口加密协议发送）与退出。
 * 不测试口令错误：连续失败会触发账号锁定（默认 10 分钟内 5 次），影响共用的测试账号
 */
test.describe('登录与退出', () => {
  let backend: BackendInfo = { cryptoEnabled: false };

  // 在打开浏览器之前确认后端与账号，不满足时整组跳过（或失败）
  test.beforeAll(async ({ request }, testInfo) => {
    backend = await requireBackend(request, testInfo);
    requireCredentials(testInfo);
  });

  test('加密登录后进入首页，退出后回到登录页', async ({ page }, testInfo) => {
    const loginRequest = page.waitForRequest(
      (req) => req.method() === 'POST' && req.url().endsWith('/auth/login'),
    );
    const loginResponse = page.waitForResponse((res) =>
      res.url().endsWith('/auth/login'),
    );
    await login(page, testInfo);

    const sent = await loginRequest;
    const body = sent.postData() ?? '';
    if (backend.cryptoEnabled) {
      // 加密信封：带加密标记的请求头，请求体中没有明文口令
      expect(sent.headers()['x-tuoyu-encrypted']).toBe('1');
      expect(body).not.toContain(env.password);
      expect(body).not.toContain('"password"');
    } else {
      testInfo.annotations.push({
        description: '后端未开启接口加密，登录按明文发送，未验证加密协议',
        type: 'warning',
      });
    }
    const response = await loginResponse;
    expect(response.status()).toBe(200);

    // 登录成功后离开登录页
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page.getByText('登录成功')).toBeVisible();

    // 退出：快捷键 Alt+Q 打开确认框
    await page.keyboard.press('Alt+KeyQ');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /确\s*认/ }).click();
    await expect(page).toHaveURL(/\/auth\/login/);

    // 退出后访问业务页面会回到登录页
    await page.goto(appPath('/system/post'));
    await expect(page).toHaveURL(/\/auth\/login/);

    // Warm-Flow 设计器保存在 localStorage 中的令牌已清除
    const warmKeys = await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key.startsWith('Warm-')),
    );
    expect(warmKeys).toEqual([]);
  });
});
