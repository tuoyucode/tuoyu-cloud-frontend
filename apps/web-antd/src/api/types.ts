/** 后端分页结果（PageResult） */
export interface PageResult<T> {
  rows: T[];
  total: number;
}

/** 分页查询参数（PageQuery） */
export interface PageQuery {
  isAsc?: 'asc' | 'desc';
  orderByColumn?: string;
  pageNum?: number;
  pageSize?: number;
}

/** 后端 Hutool Tree 序列化后的树节点 */
export interface TreeNode<T = number | string> {
  children?: TreeNode<T>[];
  id: T;
  label: string;
  parentId: T;
  weight?: number;
}
