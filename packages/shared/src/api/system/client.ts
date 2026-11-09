import type { PageQuery, PageResult } from '../types';

import { exportExcel, requestClient } from '../request';

export namespace ClientApi {
  /** 客户端（SysClientVo） */
  export interface Client {
    /** 允许访问的路径，逗号分隔；为空表示不限制 */
    accessPath?: string;
    accessPathList?: string[];
    /** 令牌活跃超时（秒），超过这段时间没有操作即失效 */
    activeTimeout?: number;
    /** 客户端 ID，由客户端 Key 与密钥生成，前端请求头 clientid 使用它 */
    clientId: string;
    clientKey: string;
    /** 设备类型（字典 sys_device_type） */
    deviceType?: string;
    /** 授权类型，逗号分隔（字典 sys_grant_type） */
    grantType?: string;
    grantTypeList?: string[];
    id: string;
    /** IP 白名单，逗号分隔；为空表示不限制 */
    ipWhitelist?: string;
    ipWhitelistList?: string[];
    /** 0 正常，1 停用（字典 sys_normal_disable） */
    status: string;
    /** 令牌固定超时（秒），登录后超过这段时间必须重新登录 */
    timeout?: number;
  }

  /** 查询条件（SysClientBo，均为精确匹配） */
  export interface Query extends PageQuery {
    clientId?: string;
    clientKey?: string;
    status?: string;
  }

  /** 新增、修改的参数（SysClientBo） */
  export interface Form {
    /** 每行一条，后端按换行、逗号或分号拆分 */
    accessPath?: string;
    activeTimeout?: number;
    clientId?: string;
    clientKey: string;
    /** 客户端密钥：新增时必填；修改时不传，后端保留原值（列表和详情接口都不返回密钥） */
    clientSecret?: string;
    deviceType?: string;
    grantTypeList: string[];
    id?: string;
    /** 每行一条，后端按换行、逗号或分号拆分 */
    ipWhitelist?: string;
    status?: string;
    timeout?: number;
  }
}

const BASE = '/system/client';

export function listClient(query: ClientApi.Query) {
  return requestClient.get<PageResult<ClientApi.Client>>(`${BASE}/list`, {
    params: query,
  });
}

export function getClient(id: string) {
  return requestClient.get<ClientApi.Client>(`${BASE}/${id}`);
}

export function addClient(data: ClientApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateClient(data: ClientApi.Form) {
  return requestClient.put<null>(BASE, data);
}

/** 修改状态：后端按 clientId 定位 */
export function updateClientStatus(clientId: string, status: string) {
  return requestClient.put<null>(`${BASE}/changeStatus`, { clientId, status });
}

export function removeClient(ids: string[]) {
  return requestClient.delete<null>(`${BASE}/${ids.join(',')}`);
}

export function exportClient(query: ClientApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}
