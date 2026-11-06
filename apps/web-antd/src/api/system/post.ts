import type { PageQuery, PageResult, TreeNode } from '#/api/types';

import { exportExcel, requestClient } from '#/api/request';

export namespace PostApi {
  /** 岗位（SysPostVo） */
  export interface Post {
    createTime?: string;
    deptId: string;
    deptName?: string;
    postCategory?: string;
    postCode: string;
    postId: string;
    postName: string;
    postSort: number;
    remark?: string;
    /** 0 正常，1 停用（字典 sys_normal_disable） */
    status: string;
  }

  /** 查询条件（SysPostBo） */
  export interface Query extends PageQuery {
    /** 按部门筛选（含下级部门） */
    belongDeptId?: string;
    postCategory?: string;
    postCode?: string;
    postName?: string;
    status?: string;
  }

  /** 新增、修改的参数（SysPostBo） */
  export type Form = Omit<Post, 'createTime' | 'deptName' | 'postId'> & {
    postId?: string;
  };
}

const BASE = '/system/post';

export function listPost(query: PostApi.Query) {
  return requestClient.get<PageResult<PostApi.Post>>(`${BASE}/list`, {
    params: query,
  });
}

export function getPost(postId: string) {
  return requestClient.get<PostApi.Post>(`${BASE}/${postId}`);
}

export function addPost(data: PostApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updatePost(data: PostApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removePost(postIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${postIds.join(',')}`);
}

export function exportPost(query: PostApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}

/** 部门树（用于选择岗位所属部门） */
export function getPostDeptTree() {
  return requestClient.get<TreeNode<string>[]>(`${BASE}/deptTree`);
}
