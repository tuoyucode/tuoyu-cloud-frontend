import { requestClient } from '#/api/request';

export namespace DeptApi {
  /** 部门（SysDeptVo） */
  export interface Dept {
    /** 祖级列表，例如 0,100,101 */
    ancestors?: string;
    createTime?: string;
    deptCategory?: string;
    deptId: string;
    deptName: string;
    email?: string;
    /** 负责人的用户 ID */
    leader?: null | string;
    leaderName?: string;
    orderNum: number;
    /** 根部门为 0 */
    parentId: number | string;
    parentName?: string;
    phone?: string;
    /** 0 正常，1 停用（字典 sys_normal_disable） */
    status: string;
  }

  /** 查询条件（SysDeptBo） */
  export interface Query {
    /** 按部门筛选（含下级部门） */
    belongDeptId?: string;
    deptCategory?: string;
    deptName?: string;
    status?: string;
  }

  /** 新增、修改的参数（SysDeptBo） */
  export interface Form {
    deptCategory?: string;
    deptId?: string;
    deptName: string;
    email?: string;
    leader?: null | string;
    orderNum: number;
    parentId: number | string;
    phone?: string;
    status?: string;
  }

  /** 可选为负责人的用户（SysUserVo 中用到的字段） */
  export interface LeaderCandidate {
    nickName: string;
    userId: string;
    userName: string;
  }
}

const BASE = '/system/dept';

/** 部门列表：扁平列表，由页面组装成树 */
export function listDept(query: DeptApi.Query = {}) {
  return requestClient.get<DeptApi.Dept[]>(`${BASE}/list`, { params: query });
}

/** 部门列表，排除指定部门及其下级（用于选择上级部门） */
export function listDeptExcludeChild(deptId: string) {
  return requestClient.get<DeptApi.Dept[]>(`${BASE}/list/exclude/${deptId}`);
}

export function getDept(deptId: string) {
  return requestClient.get<DeptApi.Dept>(`${BASE}/${deptId}`);
}

export function addDept(data: DeptApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateDept(data: DeptApi.Form) {
  return requestClient.put<null>(BASE, data);
}

/** 删除部门。有下级部门、用户或岗位时，后端拒绝并返回原因 */
export function removeDept(deptId: string) {
  return requestClient.delete<null>(`${BASE}/${deptId}`);
}

/** 部门下的用户（用于选择负责人，需要 system:user:list 权限） */
export function listDeptUsers(deptId: string) {
  return requestClient.get<DeptApi.LeaderCandidate[]>(
    `/system/user/list/dept/${deptId}`,
  );
}
