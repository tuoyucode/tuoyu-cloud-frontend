import { describe, expect, it } from 'vitest';

import { toPageQuery, toSortParam } from '../page-query';

describe('toPageQuery', () => {
  it('页码从 1 开始，原样传给后端', () => {
    expect(toPageQuery({ currentPage: 1, pageSize: 10 })).toEqual({
      page: 1,
      pageSize: 10,
    });
    expect(toPageQuery({ currentPage: 3, pageSize: 50 })).toEqual({
      page: 3,
      pageSize: 50,
    });
  });

  it('有排序时带上 sort，没有时不发送', () => {
    expect(
      toPageQuery({ currentPage: 1, pageSize: 10 }, [
        { field: 'operTime', order: 'desc' },
      ]),
    ).toEqual({ page: 1, pageSize: 10, sort: ['operTime,desc'] });
    expect(
      toPageQuery({ currentPage: 1, pageSize: 10 }, []),
    ).not.toHaveProperty('sort');
  });
});

describe('toSortParam', () => {
  it('每项为“属性名,方向”，按优先级排列', () => {
    expect(
      toSortParam([
        { field: 'status', order: 'asc' },
        { field: 'loginTime', order: 'desc' },
      ]),
    ).toEqual(['status,asc', 'loginTime,desc']);
  });

  it('方向统一为小写', () => {
    expect(toSortParam([{ field: 'costTime', order: 'DESC' }])).toEqual([
      'costTime,desc',
    ]);
  });

  it('取消排序（方向为空）、缺少字段或方向不合法的项忽略', () => {
    expect(toSortParam([{ field: 'operTime', order: null }])).toBeUndefined();
    expect(toSortParam([{ field: '', order: 'asc' }])).toBeUndefined();
    expect(toSortParam([{ field: 'a', order: 'up' }])).toBeUndefined();
    expect(
      toSortParam([
        { field: 'a', order: '' },
        { field: 'b', order: 'asc' },
      ]),
    ).toEqual(['b,asc']);
  });

  it('没有排序时为 undefined', () => {
    expect(toSortParam()).toBeUndefined();
    expect(toSortParam(null)).toBeUndefined();
    expect(toSortParam([])).toBeUndefined();
  });
});
