import { putEncrypted, requestClient } from '#/api/request';

export namespace ProfileApi {
  /** 本人的用户信息（ProfileUserVo）：个人中心专用，联系方式不脱敏 */
  export interface User {
    /** 头像的存储 ID */
    avatar?: null | string;
    avatarUrl?: null | string;
    deptId?: null | string;
    deptName?: null | string;
    email?: null | string;
    /** 0 男，1 女，2 未知（字典 sys_user_gender） */
    gender?: null | string;
    /** 最后登录时间（yyyy-MM-dd HH:mm:ss） */
    loginDate?: null | string;
    loginIp?: null | string;
    nickName: string;
    phoneNumber?: null | string;
    userId: string;
    userName: string;
    userType?: null | string;
  }

  /** 个人信息（SysProfileController.ProfileVo） */
  export interface Profile {
    /** 岗位名称，逗号分隔 */
    postGroup?: null | string;
    /** 角色名称，逗号分隔 */
    roleGroup?: null | string;
    user: User;
  }

  /** 修改个人信息（SysUserProfileBo）：不传的字段不修改 */
  export interface Form {
    /** 空字符串表示清空 */
    email?: string;
    gender?: string;
    nickName?: string;
    /** 空字符串表示清空，其他值必须是合法的手机号 */
    phoneNumber?: string;
  }

  /** 修改密码（SysProfileController.SysUserPasswordBo） */
  export interface PasswordForm {
    newPassword: string;
    oldPassword: string;
  }
}

const BASE = '/system/user/profile';

/** 本人的个人信息（只要求登录） */
export function getProfile() {
  return requestClient.get<ProfileApi.Profile>(BASE);
}

/** 修改本人的昵称、邮箱、手机号、性别 */
export function updateProfile(data: ProfileApi.Form) {
  return requestClient.put<null>(BASE, data);
}

/**
 * 修改本人的密码。后端标注了 @ApiEncrypt，按接口加密协议发送；
 * 后端只更新密码，不会让已登录的会话失效
 */
export function updatePassword(data: ProfileApi.PasswordForm) {
  return putEncrypted<null>(`${BASE}/updatePwd`, data);
}
