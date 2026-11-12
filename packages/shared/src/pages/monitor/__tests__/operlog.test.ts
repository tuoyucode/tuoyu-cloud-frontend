import { describe, expect, it } from 'vitest';

import { prettyJson, toQuery } from '../operlog';

describe('操作日志：查询条件', () => {
  it('操作时间按整天转换为 params.beginTime / endTime', () => {
    expect(
      toQuery({ operTime: ['2026-11-01', '2026-11-11'], title: '岗位' }),
    ).toEqual({
      params: {
        beginTime: '2026-11-01 00:00:00',
        endTime: '2026-11-11 23:59:59',
      },
      title: '岗位',
    });
    expect(toQuery({ operTime: [], title: '岗位' })).toEqual({ title: '岗位' });
  });
});

describe('操作日志：参数显示', () => {
  it('按 JSON 缩进显示，不是 JSON 时原样显示，空值为空字符串', () => {
    expect(prettyJson('{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(prettyJson('a=1&b=2')).toBe('a=1&b=2');
    expect(prettyJson(undefined)).toBe('');
    expect(prettyJson('')).toBe('');
  });
});
