/** 后端分页结果（PageResult） */
export interface PageResult<T> {
  items: T[];
  total: number;
}

/** 分页查询参数（PageParam），表格中用 utils/page-query.ts 的 toPageQuery 生成 */
export interface PageQuery {
  /** 页码，从 1 开始 */
  page?: number;
  pageSize?: number;
  /** 排序，每项“属性名,asc|desc”，可以有多项（按顺序优先） */
  sort?: string[];
}

/** 后端 Hutool Tree 序列化后的树节点 */
export interface TreeNode<T = number | string> {
  children?: TreeNode<T>[];
  id: T;
  label: string;
  parentId: T;
  weight?: number;
}
