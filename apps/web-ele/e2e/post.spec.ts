import type { Locator, Page } from 'playwright/test';

import { expect, test } from 'playwright/test';

import {
  appPath,
  expectToast,
  login,
  requireBackend,
  requireCredentials,
} from './support';

/** 本次测试使用的唯一编码，避免与已有数据冲突 */
const suffix = Date.now().toString(36);
const postCode = `e2e_${suffix}`;
const postName = `端到端测试岗位 ${suffix}`;
const renamed = `${postName}（已修改）`;

/** 表格中包含指定文字的行 */
function row(page: Page, text: string): Locator {
  return page.locator('.vxe-body--row').filter({ hasText: text });
}

/**
 * 行内操作按钮。操作列固定在右侧时，vxe-table 把固定列渲染成单独的表格，
 * 按钮所在的行里没有业务字段的文字，所以先按文字找到行的 rowid，再到同一 rowid 的行中找按钮
 */
async function rowButton(page: Page, text: string, name: RegExp) {
  const rowId = await row(page, text).first().getAttribute('rowid');
  return page
    .locator(`.vxe-body--row[rowid="${rowId}"]`)
    .getByRole('button', { name })
    .filter({ visible: true })
    .first();
}

/** 打开的抽屉 */
function drawer(page: Page): Locator {
  return page.getByRole('dialog').last();
}

/**
 * 按岗位编码查询，并确认分页接口的契约：请求带 page（从 1 开始）与 pageSize，
 * 返回 ApiResult（code 0），data 为 { items, total }
 */
async function searchByCode(page: Page, code: string) {
  const form = page.locator('form').first();
  await form.getByLabel('岗位编码', { exact: true }).fill(code);
  const listResponse = page.waitForResponse((res) =>
    new URL(res.url()).pathname.endsWith('/system/post/list'),
  );
  await form.getByRole('button', { name: /搜\s*索|查\s*询/ }).click();

  const response = await listResponse;
  const params = new URL(response.url()).searchParams;
  expect(params.get('page')).toBe('1');
  expect(params.get('pageSize')).toBe('10');
  expect(params.has('pageNum')).toBe(false);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.code).toBe(0);
  expect(typeof body.traceId).toBe('string');
  expect(Array.isArray(body.data?.items)).toBe(true);
  expect(typeof body.data?.total).toBe('number');
}

test.describe('岗位管理', () => {
  // 在打开浏览器之前确认后端与账号，不满足时整组跳过（或失败）
  test.beforeAll(async ({ request }, testInfo) => {
    await requireBackend(request, testInfo);
    requireCredentials(testInfo);
  });

  test('新增、查询、修改、删除岗位', async ({ page }, testInfo) => {
    await login(page, testInfo);
    await expect(page).not.toHaveURL(/\/auth\/login/);

    await page.goto(appPath('/system/post'));
    await expect(page.getByText('岗位列表')).toBeVisible();

    // 新增
    await page.getByRole('button', { name: '新增岗位' }).click();
    const createDrawer = drawer(page);
    await expect(createDrawer.getByText('新增岗位')).toBeVisible();
    await createDrawer.getByPlaceholder('例如：测试工程师').fill(postName);
    await createDrawer.getByPlaceholder('例如：qa').fill(postCode);
    // 所属部门：打开树形下拉（ElTreeSelect，抽屉中只有这一个下拉框），选择第一个部门。
    // 下拉面板挂在 body 下，页面中可能还有其他隐藏的下拉，只取可见的节点
    await createDrawer.locator('.el-select').first().click();
    await page.locator('.el-tree-node__content:visible').first().click();
    await createDrawer.getByRole('button', { name: /保\s*存/ }).click();
    await expectToast(page, '已保存');

    // 查询
    await searchByCode(page, postCode);
    await expect(row(page, postCode)).toBeVisible();
    await expect(row(page, postCode)).toContainText(postName);

    // 修改
    const editButton = await rowButton(page, postCode, /修\s*改/);
    await editButton.click();
    const editDrawer = drawer(page);
    await expect(editDrawer.getByText('编辑岗位')).toBeVisible();
    const nameInput = editDrawer.getByPlaceholder('例如：测试工程师');
    await expect(nameInput).toHaveValue(postName);
    await nameInput.fill(renamed);
    await editDrawer.getByRole('button', { name: /保\s*存/ }).click();
    await expectToast(page, '已保存');
    await expect(row(page, postCode)).toContainText(renamed);

    // 删除：行内按钮打开气泡确认（ElPopconfirm），再点确认按钮“删除岗位”
    const deleteButton = await rowButton(page, postCode, /删\s*除/);
    await deleteButton.click();
    await page
      .locator('.el-popconfirm:visible')
      .getByRole('button', { name: '删除岗位' })
      .click();
    await expectToast(page, '已删除');
    await expect(row(page, postCode)).toHaveCount(0);
  });
});
