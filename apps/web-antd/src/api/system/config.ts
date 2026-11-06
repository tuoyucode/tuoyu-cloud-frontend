import type { PageQuery, PageResult } from '#/api/types';

import { exportExcel, requestClient } from '#/api/request';

export namespace ConfigApi {
  /** 参数（SysConfigVo） */
  export interface Config {
    configId: string;
    configKey: string;
    configName: string;
    /** 是否系统内置：Y 是，N 否（字典 sys_yes_no） */
    configType: string;
    configValue: string;
    createTime?: string;
    remark?: string;
  }

  /** 查询条件（SysConfigBo） */
  export interface Query extends PageQuery {
    configKey?: string;
    configName?: string;
    configType?: string;
  }

  /** 新增、修改的参数（SysConfigBo） */
  export type Form = Omit<Config, 'configId' | 'createTime'> & {
    configId?: string;
  };
}

const BASE = '/system/config';

export function listConfig(query: ConfigApi.Query) {
  return requestClient.get<PageResult<ConfigApi.Config>>(`${BASE}/list`, {
    params: query,
  });
}

export function getConfig(configId: string) {
  return requestClient.get<ConfigApi.Config>(`${BASE}/${configId}`);
}

export function addConfig(data: ConfigApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateConfig(data: ConfigApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeConfig(configIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${configIds.join(',')}`);
}

export function exportConfig(query: ConfigApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}

/** 刷新参数缓存：直接修改数据库后，让新值立即生效 */
export function refreshConfigCache() {
  return requestClient.delete<null>(`${BASE}/refreshCache`);
}
