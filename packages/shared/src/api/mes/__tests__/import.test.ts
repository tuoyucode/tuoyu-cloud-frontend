import { describe, expect, it, vi } from 'vitest';

import { splitImportMessage } from '../import';

vi.mock('../../request', () => ({
  exportExcel: vi.fn(),
  requestClient: { upload: vi.fn() },
  silentErrors: (config: object) => config,
}));

describe('主数据导入的提示拆分', () => {
  it('第一行是摘要，其余每行一条错误', () => {
    const message =
      '导入失败，没有写入任何数据。共 2 处错误：\n第 5 行：物料编码 M001 已存在\n第 7 行：计量单位不能为空';

    expect(splitImportMessage(message)).toEqual({
      lines: ['第 5 行：物料编码 M001 已存在', '第 7 行：计量单位不能为空'],
      summary: '导入失败，没有写入任何数据。共 2 处错误：',
    });
  });

  it('兼容 Windows 换行，忽略空行与首尾空白', () => {
    expect(
      splitImportMessage('  导入失败：\r\n\r\n 第 2 行：版本不能为空 \r\n'),
    ).toEqual({ lines: ['第 2 行：版本不能为空'], summary: '导入失败：' });
  });

  it('成功或没有明细时只有摘要', () => {
    expect(splitImportMessage('导入成功，共 3 条物料')).toEqual({
      lines: [],
      summary: '导入成功，共 3 条物料',
    });
    expect(splitImportMessage('')).toEqual({ lines: [], summary: '' });
  });
});
