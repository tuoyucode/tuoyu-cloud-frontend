import type { PageQuery, PageResult, TreeNode } from '../types';
import type { UserApi } from './user';

import { exportExcel, requestClient } from '../request';

export namespace RoleApi {
  /**
   * 数据范围：1 全部，2 自定义，3 本部门，4 本部门及以下，5 仅本人，6 本部门及以下或本人
   */
  export type DataScope = '1' | '2' | '3' | '4' | '5' | '6';

  /** 角色（SysRoleVo） */
  export interface Role {
    createTime?: string;
    dataScope?: DataScope;
    /** 部门树是否父子联动 */
    deptCheckStrictly?: boolean;
    /** 菜单树是否父子联动 */
    menuCheckStrictly?: boolean;
    remark?: string;
    roleId: string;
    roleKey: string;
    roleName: string;
    roleSort: number;
    /** 0 正常，1 停用（字典 sys_normal_disable） */
    status: string;
    /** 是否为超级管理员角色（后端不允许修改） */
    superAdmin?: boolean;
  }

  /** 查询条件（SysRoleBo） */
  export interface Query extends PageQuery {
    /** 创建时间范围：params[beginTime]、params[endTime] */
    params?: Record<string, unknown>;
    roleKey?: string;
    roleName?: string;
    status?: string;
  }

  /** 新增、修改基础信息的参数（SysRoleBo） */
  export interface Form {
    menuCheckStrictly?: boolean;
    /** 只在新增时随基础信息提交；修改菜单权限走 updateRolePermission */
    menuIds?: string[];
    remark?: string;
    roleId?: string;
    roleKey: string;
    roleName: string;
    roleSort: number;
    status?: string;
  }

  /** 修改菜单权限与数据权限的参数（SysRoleBo），两者一起覆盖保存 */
  export interface Permission {
    dataScope: DataScope;
    deptCheckStrictly: boolean;
    deptIds: string[];
    menuCheckStrictly: boolean;
    menuIds: string[];
    roleId: string;
  }

  /** 菜单树节点（附带菜单类型等信息） */
  export interface MenuNode extends TreeNode<string> {
    children?: MenuNode[];
    icon?: string;
    /** M 目录，C 菜单，F 按钮 */
    menuType?: string;
    status?: string;
    visible?: string;
  }

  /** 部门树节点（停用的部门 disabled 为 true） */
  export interface DeptNode extends TreeNode<string> {
    children?: DeptNode[];
    disabled?: boolean;
  }

  /** 角色已有的菜单：父子联动时 checkedKeys 不含上级菜单 */
  export interface MenuTree {
    checkedKeys: string[];
    menus: MenuNode[];
  }

  /** 角色已有的部门：父子联动时 checkedKeys 不含上级部门 */
  export interface DeptTree {
    checkedKeys: string[];
    depts: DeptNode[];
  }

  /** 已分配、未分配用户的查询条件 */
  export interface AuthUserQuery extends PageQuery {
    phoneNumber?: string;
    roleId: string;
    userName?: string;
  }
}

const BASE = '/system/role';

export function listRole(query: RoleApi.Query) {
  return requestClient.get<PageResult<RoleApi.Role>>(`${BASE}/list`, {
    params: query,
  });
}

export function getRole(roleId: string) {
  return requestClient.get<RoleApi.Role>(`${BASE}/${roleId}`);
}

export function addRole(data: RoleApi.Form) {
  return requestClient.post<null>(BASE, data);
}

/** 修改基础信息（不含菜单权限、数据权限） */
export function updateRole(data: RoleApi.Form) {
  return requestClient.put<null>(BASE, data);
}

/** 修改菜单权限与数据权限（两者都会按参数覆盖） */
export function updateRolePermission(data: RoleApi.Permission) {
  return requestClient.put<null>(`${BASE}/permission`, data);
}

export function changeRoleStatus(roleId: string, status: string) {
  return requestClient.put<null>(`${BASE}/changeStatus`, { roleId, status });
}

export function removeRole(roleIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${roleIds.join(',')}`);
}

export function exportRole(query: RoleApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}

/** 全部菜单树（新增角色时使用） */
export function getMenuTree() {
  return requestClient.get<RoleApi.MenuNode[]>('/system/menu/treeselect');
}

/** 菜单树与角色已有的菜单 */
export function getRoleMenuTree(roleId: string) {
  return requestClient.get<RoleApi.MenuTree>(
    `/system/menu/roleMenuTreeselect/${roleId}`,
  );
}

/** 部门树与角色已有的部门（数据权限） */
export function getRoleDeptTree(roleId: string) {
  return requestClient.get<RoleApi.DeptTree>(`${BASE}/deptTree/${roleId}`);
}

/** 已分配该角色的用户 */
export function listAllocatedUser(query: RoleApi.AuthUserQuery) {
  return requestClient.get<PageResult<UserApi.User>>(
    `${BASE}/authUser/allocatedList`,
    { params: query },
  );
}

/** 未分配该角色的用户 */
export function listUnallocatedUser(query: RoleApi.AuthUserQuery) {
  return requestClient.get<PageResult<UserApi.User>>(
    `${BASE}/authUser/unallocatedList`,
    { params: query },
  );
}

/** 把角色分配给多个用户 */
export function assignRoleUsers(roleId: string, userIds: string[]) {
  return requestClient.put<null>(`${BASE}/authUser/selectAll`, null, {
    params: { roleId, userIds: userIds.join(',') },
  });
}

/** 取消一个用户的该角色 */
export function cancelRoleUser(roleId: string, userId: string) {
  return requestClient.put<null>(`${BASE}/authUser/cancel`, {
    roleId,
    userId,
  });
}

/** 取消多个用户的该角色 */
export function cancelRoleUsers(roleId: string, userIds: string[]) {
  return requestClient.put<null>(`${BASE}/authUser/cancelAll`, null, {
    params: { roleId, userIds: userIds.join(',') },
  });
}
