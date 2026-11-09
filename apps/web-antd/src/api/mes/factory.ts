import type { PageQuery, PageResult } from '#/api/types';

import { exportExcel, requestClient } from '#/api/request';

import { MES_BASE } from './common';

export namespace FactoryApi {
  /** 工厂（MesFactoryVo） */
  export interface Factory {
    address?: string;
    contact?: string;
    contactPhone?: string;
    createTime?: string;
    factoryCode: string;
    factoryId: string;
    factoryName: string;
    remark?: string;
    shortName?: string;
    sortNo: number;
    /** 0 正常，1 停用 */
    status: string;
  }

  /** 查询条件（MesFactoryBo） */
  export interface Query extends PageQuery {
    factoryCode?: string;
    factoryName?: string;
    status?: string;
  }

  /** 新增、修改的参数（MesFactoryBo） */
  export type Form = Omit<Factory, 'createTime' | 'factoryId'> & {
    factoryId?: string;
  };
}

const BASE = `${MES_BASE}/factory`;

export function listFactory(query: FactoryApi.Query) {
  return requestClient.get<PageResult<FactoryApi.Factory>>(`${BASE}/list`, {
    params: query,
  });
}

export function getFactory(factoryId: string) {
  return requestClient.get<FactoryApi.Factory>(`${BASE}/${factoryId}`);
}

export function addFactory(data: FactoryApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateFactory(data: FactoryApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeFactory(factoryIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${factoryIds.join(',')}`);
}

export function exportFactory(query: FactoryApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}
