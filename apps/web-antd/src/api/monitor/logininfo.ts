import type { PageQuery, PageResult } from '#/api/types';

import { exportExcel, requestClient } from '#/api/request';

export namespace LogininfoApi {
  /** 登录日志（SysLoginInfoVo） */
  export interface Logininfo {
    browser?: string;
    clientKey?: string;
    /** 设备类型（字典 sys_device_type） */
    deviceType?: string;
    infoId: string;
    ipaddr?: string;
    loginLocation?: string;
    loginTime?: string;
    /** 提示消息，例如“登录成功”“密码输入错误 1 次” */
    msg?: string;
    os?: string;
    /** 登录状态（字典 sys_common_status）：0 成功，1 失败 */
    status: string;
    userName: string;
  }

  /** 查询条件（SysLoginInfoBo） */
  export interface Query extends PageQuery {
    ipaddr?: string;
    /** 登录时间范围，格式 YYYY-MM-DD HH:mm:ss，起止都有时才生效 */
    params?: { beginTime?: string; endTime?: string };
    status?: string;
    userName?: string;
  }
}

const BASE = '/monitor/loginInfo';

// params 为嵌套对象，axios 会序列化为 params[beginTime]=...，与后端 Bo 中的 Map 绑定一致

export function listLogininfo(query: LogininfoApi.Query) {
  return requestClient.get<PageResult<LogininfoApi.Logininfo>>(`${BASE}/list`, {
    params: query,
  });
}

export function removeLogininfo(infoIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${infoIds.join(',')}`);
}

/** 清空全部登录日志 */
export function cleanLogininfo() {
  return requestClient.delete<null>(`${BASE}/clean`);
}

/** 解锁账号：清除密码错误次数，账号可以立即重新登录 */
export function unlockAccount(userName: string) {
  return requestClient.get<null>(
    `${BASE}/unlock/${encodeURIComponent(userName)}`,
  );
}

export function exportLogininfo(query: LogininfoApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}
