import type { PageQuery } from '#/api/types';

/** 表格的排序条件（vxe-table 远程排序时 proxyConfig 传入的 sorts 中的一项） */
export interface SortItem {
  field?: null | string;
  order?: null | string;
}

/** 表格的分页状态（vxe-table proxyConfig 传入的 page） */
export interface PageState {
  currentPage: number;
  pageSize: number;
}

/**
 * 表格排序转成后端的 sort 参数：每项“属性名,asc|desc”，按优先级排列。
 * 没有字段或方向的项忽略；没有排序时返回 undefined（不发送 sort）
 */
export function toSortParam(
  sorts?: null | readonly SortItem[],
): string[] | undefined {
  const items = (sorts ?? []).flatMap((item) => {
    const field = item.field?.trim();
    const order = item.order?.toLowerCase();
    if (!field || (order !== 'asc' && order !== 'desc')) {
      return [];
    }
    return [`${field},${order}`];
  });
  return items.length > 0 ? items : undefined;
}

/**
 * 表格的分页与排序转成后端的分页参数（page 从 1 开始）
 */
export function toPageQuery(
  page: PageState,
  sorts?: null | readonly SortItem[],
): PageQuery {
  const sort = toSortParam(sorts);
  return {
    page: page.currentPage,
    pageSize: page.pageSize,
    ...(sort ? { sort } : {}),
  };
}
