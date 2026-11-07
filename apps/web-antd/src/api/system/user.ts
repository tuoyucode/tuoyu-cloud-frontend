import type { PostApi } from '#/api/system/post';
import type { RoleApi } from '#/api/system/role';
import type { PageQuery, PageResult, TreeNode } from '#/api/types';
import type { ApiResult } from '#/utils/api-result';

import {
  exportExcel,
  postEncrypted,
  putEncrypted,
  requestClient,
  silentErrors,
} from '#/api/request';
import { errorMessageOf, isSuccess } from '#/utils/api-result';

export namespace UserApi {
  /** 用户（SysUserVo） */
  export interface User {
    avatar?: string;
    avatarUrl?: string;
    createTime?: string;
    deptId?: string;
    deptName?: string;
    /** 没有 system:user:edit 权限时后端返回脱敏后的值 */
    email?: string;
    /** 0 男，1 女，2 未知（字典 sys_user_gender） */
    gender?: string;
    loginDate?: string;
    loginIp?: string;
    nickName: string;
    phoneNumber?: string;
    remark?: string;
    /** 0 正常，1 停用（字典 sys_normal_disable） */
    status: string;
    userId: string;
    userName: string;
    userType?: string;
  }

  /** 查询条件（SysUserBo） */
  /** 选择用户时的用户（SysUserOptionVo）：只有识别用户所需的字段，不含联系方式 */
  export interface Option {
    deptId?: string;
    deptName?: string;
    nickName: string;
    userId: string;
    userName: string;
  }

  /** 选择用户的查询条件 */
  export interface OptionQuery extends PageQuery {
    /** 按部门筛选（含下级部门） */
    deptId?: string;
    nickName?: string;
    userName?: string;
  }

  export interface Query extends PageQuery {
    /** 按部门筛选（含下级部门） */
    deptId?: string;
    nickName?: string;
    /** 创建时间范围：params[beginTime]、params[endTime] */
    params?: Record<string, unknown>;
    phoneNumber?: string;
    status?: string;
    userName?: string;
  }

  /** 新增、修改的参数（SysUserBo） */
  export interface Form {
    deptId?: string;
    email?: string;
    gender?: string;
    nickName: string;
    /** 只在新增时提交 */
    password?: string;
    phoneNumber?: string;
    /** 可以为空；修改时空数组表示清空全部岗位 */
    postIds?: string[];
    remark?: string;
    /** 可以为空；修改时空数组表示清空全部角色 */
    roleIds: string[];
    status?: string;
    userId?: string;
    userName: string;
  }

  /** 用户详情（SysUserInfoVo）：新增时只有可选的角色 */
  export interface Detail {
    postIds?: string[];
    /** 用户所属部门下的岗位 */
    posts?: PostApi.Post[];
    roleIds?: string[];
    /** 可选的角色（已排除停用的角色和超级管理员角色） */
    roles: RoleApi.Role[];
    user?: User;
  }

  /** 分配角色页面的数据（SysUserInfoVo）：roles 中 flag 为 true 表示已分配 */
  export interface AuthRole {
    roles: (RoleApi.Role & { flag: boolean })[];
    user: User;
  }

  /** 导入结果：后端把成功或失败的明细写在 message 中 */
  export interface ImportResult {
    message: string;
    success: boolean;
  }
}

const BASE = '/system/user';

/** 超级管理员用户 ID（SystemConstants.SUPER_ADMIN_USER_ID），后端不允许修改 */
export const SUPER_ADMIN_USER_ID = '1761100000000000001';

export function isSuperAdminUser(userId?: number | string) {
  return String(userId) === SUPER_ADMIN_USER_ID;
}

/**
 * 选择用户（工作流转办、委派、加签、抄送等）：只要求登录，只返回正常状态的用户与识别用户所需的字段
 */
export function listUserOptions(query: UserApi.OptionQuery) {
  return requestClient.get<PageResult<UserApi.Option>>(`${BASE}/options`, {
    params: query,
  });
}

export function listUser(query: UserApi.Query) {
  return requestClient.get<PageResult<UserApi.User>>(`${BASE}/list`, {
    params: query,
  });
}

/** 用户详情；不传 userId 时只返回可选的角色 */
export function getUser(userId?: string) {
  return requestClient.get<UserApi.Detail>(`${BASE}/${userId ?? ''}`);
}

/** 新增用户：请求中带初始密码，后端要求加密传输（@ApiEncrypt） */
export function addUser(data: UserApi.Form) {
  return postEncrypted<null>(BASE, data);
}

export function updateUser(data: UserApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeUser(userIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${userIds.join(',')}`);
}

export function changeUserStatus(userId: string, status: string) {
  return requestClient.put<null>(`${BASE}/changeStatus`, { status, userId });
}

/** 重置密码（后端标注了 @ApiEncrypt） */
export function resetUserPassword(userId: string, password: string) {
  return putEncrypted<null>(`${BASE}/resetPwd`, { password, userId });
}

/** 清除登录失败次数，解除账号锁定 */
export function unlockUser(userId: string) {
  return requestClient.get<null>(`${BASE}/unlock/${userId}`);
}

export function exportUser(query: UserApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}

/** 下载导入模板 */
export function downloadUserImportTemplate(fileName: string) {
  return exportExcel(`${BASE}/importTemplate`, {}, fileName);
}

/**
 * 导入用户。成功时明细在 message 中（data 为 null）；失败时 HTTP 状态为 4xx，明细在错误响应的 message 中。
 * 这里不弹出提示，由页面展示明细
 *
 * @param file Excel 文件
 * @param updateSupport 账号已存在时是否更新
 */
export async function importUser(
  file: Blob,
  updateSupport: boolean,
): Promise<UserApi.ImportResult> {
  try {
    const body = await requestClient.upload<ApiResult<null>>(
      `${BASE}/importData`,
      { file, updateSupport },
      // 取完整返回体以读取 message；导入可能较慢，放宽超时
      silentErrors({ responseReturn: 'body', timeout: 5 * 60 * 1000 }),
    );
    return { message: body?.message ?? '', success: isSuccess(body) };
  } catch (error) {
    return { message: errorMessageOf(error, ''), success: false };
  }
}

/** 分配角色页面：用户信息与全部角色 */
export function getUserAuthRole(userId: string) {
  return requestClient.get<UserApi.AuthRole>(`${BASE}/authRole/${userId}`);
}

/** 保存用户的角色（覆盖原有角色） */
export function updateUserAuthRole(userId: string, roleIds: string[]) {
  return requestClient.put<null>(`${BASE}/authRole`, null, {
    params: { roleIds: roleIds.join(','), userId },
  });
}

/** 部门树（用于左侧筛选和选择所属部门） */
export function getUserDeptTree() {
  return requestClient.get<TreeNode<string>[]>(`${BASE}/deptTree`);
}

/** 部门下的岗位（用于选择岗位） */
export function listPostOptions(deptId: string) {
  return requestClient.get<PostApi.Post[]>('/system/post/optionselect', {
    params: { deptId },
  });
}
