import type { TreeNode } from '../types';

import { exportExcel, requestClient } from '../request';

export namespace CategoryApi {
  /** 流程分类（FlowCategoryVo） */
  export interface Category {
    ancestors?: string;
    categoryId: string;
    categoryName: string;
    createTime?: string;
    orderNum?: number;
    /** 顶级分类为 0 */
    parentId: number | string;
    parentName?: string;
  }

  /** 查询条件（FlowCategoryBo） */
  export interface Query {
    categoryName?: string;
  }

  /** 新增、修改的参数（FlowCategoryBo） */
  export interface Form {
    categoryId?: string;
    categoryName: string;
    orderNum?: number;
    parentId: number | string;
  }
}

const BASE = '/workflow/category';

/** 分类列表：扁平列表，由页面组装成树 */
export function listCategory(query: CategoryApi.Query = {}) {
  return requestClient.get<CategoryApi.Category[]>(`${BASE}/list`, {
    params: query,
  });
}

export function getCategory(categoryId: string) {
  return requestClient.get<CategoryApi.Category>(`${BASE}/${categoryId}`);
}

export function addCategory(data: CategoryApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateCategory(data: CategoryApi.Form) {
  return requestClient.put<null>(BASE, data);
}

/** 删除：有下级分类或已被流程定义使用时后端拒绝 */
export function removeCategory(categoryId: string) {
  return requestClient.delete<null>(`${BASE}/${categoryId}`);
}

export function exportCategory(query: CategoryApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}

/** 分类树（选择分类用，只需登录） */
export function getCategoryTree() {
  return requestClient.get<TreeNode<string>[]>(`${BASE}/categoryTree`);
}
