import type { PageQuery, PageResult } from '../types';

import { requestClient } from '../request';
import { MES_BASE } from './common';

export namespace LocationApi {
  /** 库位（MesLocationVo） */
  export interface Location {
    createTime?: string;
    locationCode: string;
    locationId: string;
    locationName: string;
    remark?: string;
    sortNo: number;
    /** 0 正常，1 停用 */
    status: string;
    warehouseId: string;
    warehouseName?: string;
  }

  /** 查询条件（MesLocationBo） */
  export interface Query extends PageQuery {
    locationCode?: string;
    locationName?: string;
    status?: string;
    warehouseId?: string;
  }

  /** 新增、修改的参数（MesLocationBo） */
  export type Form = Omit<
    Location,
    'createTime' | 'locationId' | 'warehouseName'
  > & {
    locationId?: string;
  };
}

/** 库位在仓库页面中维护，权限码与仓库相同（mes:warehouse:*） */
const BASE = `${MES_BASE}/location`;

export function listLocation(query: LocationApi.Query) {
  return requestClient.get<PageResult<LocationApi.Location>>(`${BASE}/list`, {
    params: query,
  });
}

export function getLocation(locationId: string) {
  return requestClient.get<LocationApi.Location>(`${BASE}/${locationId}`);
}

export function addLocation(data: LocationApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateLocation(data: LocationApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeLocation(locationIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${locationIds.join(',')}`);
}
