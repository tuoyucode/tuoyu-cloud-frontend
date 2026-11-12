import { describe, expect, it } from 'vitest';

import { toQuery } from '../logininfo';

describe('登录日志：查询条件', () => {
  it('登录时间按整天转换为 params.beginTime / endTime', () => {
    expect(
      toQuery({ loginTime: ['2026-11-01', '2026-11-11'], userName: 'admin' }),
    ).toEqual({
      params: {
        beginTime: '2026-11-01 00:00:00',
        endTime: '2026-11-11 23:59:59',
      },
      userName: 'admin',
    });
  });

  it('没有选择时间范围时不带 params', () => {
    expect(toQuery({ loginTime: undefined, status: '1' })).toEqual({
      status: '1',
    });
  });
});
