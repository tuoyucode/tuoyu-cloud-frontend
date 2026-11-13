import type { Locator, Page } from 'playwright/test';

import { readFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'playwright/test';

import {
  appPath,
  env,
  expectToast,
  login,
  requireBackend,
  requireCredentials,
} from '../support';

/**
 * 制造执行的主流程：主数据与草稿工单经接口准备，其余步骤在页面上操作
 * 工单下达 → 派工 → 工作台报工 → 确认报工 → 工单自动完工 → 完工检验 → 完工入库 → 追溯
 *
 * - 只在设置 E2E_MES=true 时执行（后端需要部署制造执行模块），否则跳过；
 * - 只对测试环境运行：会留下以 E2E- 开头的工厂、车间、物料、工艺、仓库与工单（工单入库后不能删除）。
 */
const mesEnabled = process.env.E2E_MES === 'true';
const suffix = Date.now().toString(36).toUpperCase();

/** 客户端编号：与前端相同，取环境文件中的 VITE_APP_CLIENT_ID，可用 E2E_CLIENT_ID 覆盖 */
function clientId(): string {
  if (process.env.E2E_CLIENT_ID) {
    return process.env.E2E_CLIENT_ID;
  }
  const file = env.hashRouter ? '.env.production' : '.env.development';
  const text = readFileSync(
    fileURLToPath(new URL(`../../${file}`, import.meta.url)),
    'utf8',
  );
  const match = /^VITE_APP_CLIENT_ID\s*=\s*(\S+)\s*$/m.exec(text);
  if (!match?.[1]) {
    throw new Error(`${file} 中没有 VITE_APP_CLIENT_ID`);
  }
  return match[1];
}

interface ApiBody<T = any> {
  code: number;
  data: T;
  message: string;
}

/** 以当前登录用户调用后端接口（与页面相同的令牌与客户端编号） */
async function api<T = any>(
  page: Page,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const result: ApiBody<T> = await page.evaluate(
    async ({ body, clientId, method, path }) => {
      const key = Object.keys(localStorage).find((k) =>
        k.endsWith('-core-access'),
      );
      const token = key
        ? JSON.parse(localStorage.getItem(key) || '{}').accessToken
        : '';
      const init: RequestInit = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          clientid: clientId,
        },
        method,
      };
      if (body !== undefined) {
        init.body = JSON.stringify(body);
      }
      const response = await fetch(`/api${path}`, init);
      return response.json();
    },
    { body, clientId: clientId(), method, path },
  );
  expect(result.code, `${method} ${path}：${result.message}`).toBe(0);
  return result.data;
}

async function findId(page: Page, path: string, key: string) {
  const data = await api(page, 'GET', path);
  expect(data.items.length, path).toBeGreaterThan(0);
  return data.items[0][key] as string;
}

/** 表格中包含指定文字的行 */
function row(page: Page, ...texts: string[]): Locator {
  let rows = page.locator('.vxe-body--row');
  for (const text of texts) {
    rows = rows.filter({ hasText: text });
  }
  return rows;
}

/**
 * 同一行在各张表格中的部分。列固定在左侧或右侧时，vxe-table 把固定列渲染成单独的表格，
 * 固定列所在的行里没有其他列的文字，所以先按文字找到行的 rowid，再取同一 rowid 的全部行
 */
async function wholeRow(page: Page, ...texts: string[]): Promise<Locator> {
  const rowId = await row(page, ...texts)
    .first()
    .getAttribute('rowid');
  return page.locator(`.vxe-body--row[rowid="${rowId}"]`);
}

/** 行内的操作按钮（固定在右侧的操作列） */
async function clickRowAction(
  page: Page,
  text: string | string[],
  action: string,
) {
  const target = await wholeRow(page, ...(Array.isArray(text) ? text : [text]));
  await target
    .getByRole('button', { exact: true, name: action })
    .filter({ visible: true })
    .first()
    .click();
}

async function confirmModal(page: Page) {
  // 确认框可能是对话框（ElMessageBox.confirm），也可能是气泡确认（ElPopconfirm，确认按钮在最后）
  const box = page.locator('.el-message-box__btns .el-button--primary');
  const popover = page.locator(
    '.el-popconfirm:visible .el-popconfirm__action .el-button:last-child',
  );
  await box.or(popover).last().click();
}

/** 表单中按标签找到的输入控件 */
function field(scope: Locator, label: string): Locator {
  // 必填项的名称前带“* ”
  return scope.getByLabel(new RegExp(String.raw`^(\*\s*)?${label}$`)).first();
}

/** 提交对话框或抽屉：底部的主按钮 */
async function submit(scope: Locator) {
  await scope
    .locator('.el-button--primary')
    .filter({ visible: true })
    .last()
    .click();
}

function dialog(page: Page): Locator {
  return page.getByRole('dialog').last();
}

/** 选择下拉（ElSelect）中包含指定文字的选项（可输入关键字的下拉先输入再选） */
async function pick(
  page: Page,
  control: Locator,
  text: string,
  search?: string,
) {
  await control.click();
  if (search) {
    await control.fill(search);
  }
  await page
    .locator('.el-select-dropdown__item:visible')
    .filter({ hasText: text })
    .first()
    .click();
}

async function searchBy(page: Page, label: string, value: string) {
  const form = page.locator('form').first();
  await form.getByLabel(label, { exact: true }).fill(value);
  await form.getByRole('button', { name: /搜\s*索|查\s*询/ }).click();
}

test.describe('制造执行主流程', () => {
  test.beforeAll(async ({ request }, testInfo) => {
    if (!mesEnabled) {
      process.stderr.write(
        `[e2e] 跳过“${testInfo.titlePath.join(' › ')}”：没有设置 E2E_MES=true（需要后端部署制造执行模块）\n`,
      );
      testInfo.skip(true, '没有设置 E2E_MES=true');
      return;
    }
    await requireBackend(request, testInfo);
    requireCredentials(testInfo);
  });

  test('工单从下达到入库与追溯', async ({ page }, testInfo) => {
    test.setTimeout(150_000);
    await login(page, testInfo);
    await expect(page).not.toHaveURL(/\/auth\/login/);

    // ---------------------------------------------------------------- 准备：主数据与草稿工单
    const me = await api(page, 'GET', '/system/user/getInfo');
    const nickname: string =
      me.user.nickName || me.user.nickname || env.username;
    await api(page, 'POST', '/mes/factory', {
      factoryCode: `E2E-F${suffix}`,
      factoryName: `E2E工厂${suffix}`,
    });
    const factoryId = await findId(
      page,
      `/mes/factory/list?factoryCode=E2E-F${suffix}`,
      'factoryId',
    );
    await api(page, 'POST', '/mes/workshop', {
      factoryId,
      workshopCode: `E2E-W${suffix}`,
      workshopName: `E2E车间${suffix}`,
    });
    const workshopId = await findId(
      page,
      `/mes/workshop/list?workshopCode=E2E-W${suffix}`,
      'workshopId',
    );
    await api(page, 'POST', '/mes/material', {
      materialCode: `E2E-P${suffix}`,
      materialName: `E2E成品${suffix}`,
      materialType: 'product',
      traceMode: 'batch',
      unit: '台',
    });
    const productId = await findId(
      page,
      `/mes/material/list?materialCode=E2E-P${suffix}`,
      'materialId',
    );
    await api(page, 'POST', '/mes/route', {
      isDefault: 'Y',
      materialId: productId,
      operations: [
        {
          firstInspection: 'N',
          operationCode: 'OP10',
          operationName: '装配',
          seqNo: 10,
          standardMinutes: 5,
        },
        {
          firstInspection: 'N',
          operationCode: 'OP20',
          operationName: '包装',
          seqNo: 20,
          standardMinutes: 2,
        },
      ],
      routeCode: `E2E-RT${suffix}`,
      routeName: 'E2E工艺',
      routeVersion: 'V1',
    });
    const routeId = await findId(
      page,
      `/mes/route/list?routeCode=E2E-RT${suffix}`,
      'routeId',
    );
    await api(page, 'POST', '/mes/warehouse', {
      factoryId,
      warehouseCode: `E2E-WF${suffix}`,
      warehouseName: `E2E成品仓${suffix}`,
      warehouseType: 'finished',
    });
    await api(page, 'POST', '/mes/workorder', {
      materialId: productId,
      planQty: 10,
      routeId,
      workshopId,
    });
    const workorders = await api(
      page,
      'GET',
      `/mes/workorder/list?workshopId=${workshopId}&page=1&pageSize=10`,
    );
    const workorderCode: string = workorders.items[0].workorderCode;
    const workorderId: string = workorders.items[0].workorderId;

    // ---------------------------------------------------------------- 下达
    await page.goto(appPath('/mes/plan/workorder'));
    await searchBy(page, '工单编号', workorderCode);
    await expect(row(page, workorderCode)).toBeVisible();
    await clickRowAction(page, workorderCode, '下达工单');
    await confirmModal(page);
    await expectToast(page, '已下达');
    const released = await api(page, 'GET', `/mes/workorder/${workorderId}`);
    expect(released.workorderStatus).toBe('released');
    const batchCode: string = released.batchCode;
    expect(batchCode).toBeTruthy();

    // ---------------------------------------------------------------- 派工：两道工序都派给自己
    await page.goto(appPath('/mes/plan/operation-task'));
    await searchBy(page, '工单编号', workorderCode);
    for (const operation of ['装配', '包装']) {
      await expect(row(page, workorderCode, operation)).toBeVisible();
      await clickRowAction(page, [workorderCode, operation], '派工');
      const modal = dialog(page);
      await expect(
        modal.getByText(new RegExp(`派工：.*${operation}`)),
      ).toBeVisible();
      await pick(page, field(modal, '作业人'), nickname, nickname);
      await modal.getByRole('button', { name: '确认派工' }).click();
      await expectToast(page, '已派工');
    }

    // ---------------------------------------------------------------- 工作台报工：首道 10 合格，末道 9 合格 1 不良
    await page.goto(appPath('/mes/production/workbench'));
    for (const [operation, qualified, defect] of [
      ['装配', 10, 0],
      ['包装', 9, 1],
    ] as const) {
      // 左侧任务列表在每次报工后会刷新：等列表稳定后再选，并确认右侧显示的是要报的工单与工序
      await page.waitForLoadState('networkidle');
      const card = page.getByRole('button', {
        name: new RegExp(
          String.raw`^${workorderCode} .*第 \d+ 道 ${operation}`,
        ),
      });
      await card.click();
      const detail = page
        .locator('div')
        .filter({ hasText: '本工序还能报' })
        .filter({ hasText: '合格数量' })
        .last();
      await expect(
        detail.getByText(workorderCode, { exact: true }),
      ).toBeVisible();
      await expect(detail).toContainText(operation);
      await page.getByLabel('合格数量').fill(String(qualified));
      if (defect > 0) {
        await page.getByLabel('不良数量').fill(String(defect));
      }
      const submitted = page.waitForResponse(
        (res) =>
          res.request().method() === 'POST' &&
          new URL(res.url()).pathname.endsWith('/mes/production-report'),
      );
      await page.getByRole('button', { name: '提交报工' }).click();
      const response = await submitted;
      const result = await response.json();
      expect(result.code).toBe(0);
    }
    const reported = await api(page, 'GET', `/mes/workorder/${workorderId}`);
    expect(Number(reported.completedQty)).toBe(9);
    expect(Number(reported.defectQty)).toBe(1);

    // ---------------------------------------------------------------- 确认报工
    await page.goto(appPath('/mes/production/production-report'));
    await searchBy(page, '工单编号', workorderCode);
    await expect(row(page, workorderCode, '包装')).toBeVisible();
    await clickRowAction(page, [workorderCode, '包装'], '确认报工');
    await confirmModal(page);
    await expectToast(page, '已确认');

    // ---------------------------------------------------------------- 工单完工：全部工序完成后自动完工
    const completed = await api(page, 'GET', `/mes/workorder/${workorderId}`);
    expect(completed.workorderStatus).toBe('completed');
    await page.goto(appPath('/mes/plan/workorder'));
    await searchBy(page, '工单编号', workorderCode);
    await expect(row(page, workorderCode)).toBeVisible();
    const completedRow = await wholeRow(page, workorderCode);
    await expect(completedRow.filter({ hasText: '已完工' })).toBeVisible();

    // ---------------------------------------------------------------- 完工检验
    await page.goto(appPath('/mes/quality/inspection'));
    await page.getByRole('button', { name: '新增检验单' }).click();
    const createInspection = dialog(page);
    await createInspection.getByText('完工检', { exact: true }).click();
    await pick(
      page,
      field(createInspection, '工单'),
      workorderCode,
      workorderCode,
    );
    await field(createInspection, '检验数量').fill('9');
    await submit(createInspection);
    await searchBy(page, '工单编号', workorderCode);
    await clickRowAction(page, workorderCode, '录入检验结果');
    const inspect = dialog(page);
    await field(inspect, '合格数量').fill('9');
    await field(inspect, '不良数量').fill('0');
    await inspect.getByText('合格', { exact: true }).first().click();
    await submit(inspect);
    await expectToast(page, '已完成检验');

    // ---------------------------------------------------------------- 完工入库
    await page.goto(appPath('/mes/material/stock-in'));
    await page.getByRole('button', { name: '新增入库单' }).click();
    const createStockIn = dialog(page);
    await pick(
      page,
      field(createStockIn, '工单'),
      workorderCode,
      workorderCode,
    );
    await pick(
      page,
      field(createStockIn, '成品仓'),
      `E2E-WF${suffix}`,
      `E2E-WF${suffix}`,
    );
    await field(createStockIn, '入库数量').fill('9');
    await submit(createStockIn);
    await searchBy(page, '工单编号', workorderCode);
    await clickRowAction(page, workorderCode, '确认入库');
    await confirmModal(page);
    await expectToast(page, '已入库');
    const stocked = await api(page, 'GET', `/mes/workorder/${workorderId}`);
    expect(Number(stocked.stockedQty)).toBe(9);

    // ---------------------------------------------------------------- 追溯
    await page.goto(appPath('/mes/trace/trace'));
    const keyword = page.getByPlaceholder(
      '序列号 / 生产批次号 / 物料批次号 / 工单编号',
    );
    await keyword.fill(batchCode);
    await keyword.press('Enter');
    await expect(
      page.getByText(`按生产批次号“${batchCode}”匹配到 1 个工单`),
    ).toBeVisible();
    await expect(page.getByText(workorderCode).first()).toBeVisible();
    await expect(page.getByText('入库（1）')).toBeVisible();
  });
});
