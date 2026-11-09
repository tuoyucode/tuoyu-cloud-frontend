import type { PageResult } from '../types';

import { requestClient } from '../request';

export namespace OnlineApi {
  /** 在线会话（SysUserOnlineVo）：不含令牌 */
  export interface Online {
    browser?: string;
    clientKey?: string;
    /** 是否为发起本次请求的会话（即当前浏览器） */
    current?: boolean;
    deptName?: string;
    /** 设备类型（字典 sys_device_type） */
    deviceType?: string;
    ipaddr?: string;
    loginLocation?: string;
    /** 登录时间（毫秒时间戳） */
    loginTime?: number | string;
    os?: string;
    /** 会话编号：令牌的 SHA-256，不能反推出令牌，强退时用它定位会话 */
    sessionId: string;
    userName: string;
  }

  /** 查询条件：后端按完全相同匹配，不是模糊查询 */
  export interface Query {
    ipaddr?: string;
    userName?: string;
  }
}

const BASE = '/monitor/online';

/** 全部在线会话。后端不分页，一次返回全部 */
export function listOnline(query: OnlineApi.Query) {
  return requestClient.get<PageResult<OnlineApi.Online>>(`${BASE}/list`, {
    params: query,
  });
}

/** 强制退出：让该会话的令牌立即失效 */
export function forceLogout(sessionId: string) {
  return requestClient.delete<null>(`${BASE}/${sessionId}`);
}

/** 本人的在线会话（只要求登录），current 标出当前浏览器的会话 */
export async function listMyOnline() {
  const result = await requestClient.get<PageResult<OnlineApi.Online>>(BASE);
  return result?.items ?? [];
}

/** 让本人的某个会话下线（后端只在本人的会话中查找） */
export function logoutMyOnline(sessionId: string) {
  return requestClient.delete<null>(`${BASE}/myself/${sessionId}`);
}
