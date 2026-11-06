import { requestClient } from '#/api/request';

export namespace SocialApi {
  /** 本人绑定的第三方账号（SysSocialVo，只列出界面用到的字段） */
  export interface Social {
    avatar?: null | string;
    /** 绑定时间（yyyy-MM-dd HH:mm:ss） */
    createTime?: null | string;
    email?: null | string;
    /** 绑定记录 ID，解绑时使用 */
    id: string;
    nickName?: null | string;
    /** 第三方平台，例如 gitee、github、dingtalk */
    source: string;
    userName?: null | string;
  }

  /** 绑定第三方账号（SocialLoginBody）：第三方授权回跳时带回的参数 */
  export interface BindForm {
    /** 第三方回跳时的 code */
    socialCode: string;
    /** 第三方回跳时的 state */
    socialState: string;
    /** 第三方平台编码 */
    source: string;
  }
}

/** 本人绑定的第三方账号（只要求登录） */
export function listMySocial() {
  return requestClient.get<SocialApi.Social[]>('/system/social/list');
}

/** 解除本人的第三方账号绑定（认证服务按当前用户的绑定记录校验） */
export function unbindSocial(id: string) {
  return requestClient.delete<null>(`/auth/unlock/${id}`);
}

/**
 * 已配置的第三方平台编码（client-id 与 client-secret 都已填写），按配置顺序；
 * 都没配置时为空数组（只要求登录）
 */
export function listSocialSources() {
  return requestClient.get<string[]>('/auth/social/sources');
}

/** 第三方平台的授权页地址；平台未配置时失败 */
export function getSocialAuthorizeUrl(source: string) {
  return requestClient.get<string>(
    `/auth/binding/${encodeURIComponent(source)}`,
  );
}

/** 把第三方账号绑定到当前用户（第三方授权回跳后调用，只要求登录） */
export function bindSocial(data: SocialApi.BindForm) {
  return requestClient.post<null>('/auth/social/callback', data);
}
