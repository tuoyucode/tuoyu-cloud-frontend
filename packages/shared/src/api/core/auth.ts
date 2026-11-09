import {
  baseRequestClient,
  CLIENT_ID,
  contentLanguage,
  formatToken,
  postEncrypted,
  requestClient,
} from '../request';

export namespace AuthApi {
  /** 账号密码登录参数 */
  export interface LoginParams {
    /** 图形验证码；后端关闭验证码时不需要 */
    code?: string;
    password: string;
    /** 租户编码；只在开启多租户时发送 */
    tenantId?: string;
    username: string;
    /** 验证码 ID，与 code 配对 */
    uuid?: string;
  }

  /** 登录页可选择的租户（后端 LoginTenantVo.Tenant） */
  export interface LoginTenant {
    domain?: null | string;
    tenantId: string;
    tenantName: string;
  }

  /** 登录页的租户（后端 LoginTenantVo）；关闭多租户时 enabled 为 false */
  export interface LoginTenantResult {
    enabled: boolean;
    tenants: LoginTenant[];
  }

  /** 登录结果（后端 LoginVo） */
  export interface LoginResult {
    access_token: string;
    client_id: string;
    expire_in: number;
  }

  /** 图形验证码（后端 CaptchaVo） */
  export interface CaptchaResult {
    captchaEnabled: boolean;
    /** Base64 编码的 PNG，不含 data: 前缀 */
    img?: string;
    uuid?: string;
  }
}

/**
 * 账号密码登录。后端标注了 @ApiEncrypt，请求体按接口加密协议发送
 */
export async function loginApi(params: AuthApi.LoginParams) {
  return postEncrypted<AuthApi.LoginResult>('/auth/login', {
    ...params,
    clientId: CLIENT_ID,
    grantType: 'password',
  });
}

/**
 * 获取图形验证码
 */
export async function getCaptchaApi() {
  return requestClient.get<AuthApi.CaptchaResult>('/auth/code');
}

/**
 * 登录页的租户（免登录）：按访问域名识别，某个租户绑定了该域名时只返回它
 */
export async function getLoginTenantsApi(domain: string) {
  return requestClient.get<AuthApi.LoginTenantResult>('/auth/tenant/list', {
    params: { domain },
  });
}

/**
 * 退出登录。不经过统一拦截器，避免登录已失效时再次触发重新登录
 */
export async function logoutApi(token: null | string) {
  return baseRequestClient.post('/auth/logout', undefined, {
    headers: {
      Authorization: formatToken(token),
      clientid: CLIENT_ID,
      'Content-Language': contentLanguage(),
    },
  });
}
