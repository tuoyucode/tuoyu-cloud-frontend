import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace UserApi {
  /** 后端 /system/user/getInfo 的返回值（UserInfoVo） */
  export interface UserInfoResult {
    permissions: string[];
    roles: string[];
    user: {
      avatarUrl?: string;
      nickName: string;
      userId: number | string;
      userName: string;
    };
  }
}

/**
 * 获取当前登录用户的信息与权限码
 */
export async function getUserInfoApi(): Promise<{
  permissions: string[];
  userInfo: UserInfo;
}> {
  const { permissions, roles, user } =
    await requestClient.get<UserApi.UserInfoResult>('/system/user/getInfo');
  return {
    permissions: permissions ?? [],
    userInfo: {
      avatar: user.avatarUrl ?? '',
      desc: '',
      homePath: '',
      realName: user.nickName || user.userName,
      roles: roles ?? [],
      token: '',
      userId: String(user.userId),
      username: user.userName,
    },
  };
}
