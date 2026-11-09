import type { PageQuery, PageResult } from '../types';

import { exportExcel, requestClient } from '../request';
import { MES_BASE } from './common';

export namespace StationApi {
  /** 工位（MesStationVo） */
  export interface Station {
    createTime?: string;
    /** 所属工厂：由产线带出 */
    factoryId?: string;
    factoryName?: string;
    lineId: string;
    lineName?: string;
    remark?: string;
    sortNo: number;
    stationCode: string;
    stationId: string;
    stationName: string;
    /** 工位类型（与工序的建议工位类型对应） */
    stationType?: string;
    /** 0 正常，1 停用 */
    status: string;
    /** 所属车间：由产线带出 */
    workshopId?: string;
    workshopName?: string;
  }

  /** 查询条件（MesStationBo） */
  export interface Query extends PageQuery {
    lineId?: string;
    stationCode?: string;
    stationName?: string;
    status?: string;
    workshopId?: string;
  }

  /** 新增、修改的参数（MesStationBo） */
  export type Form = Omit<
    Station,
    'createTime' | 'factoryName' | 'lineName' | 'stationId' | 'workshopName'
  > & {
    stationId?: string;
  };
}

const BASE = `${MES_BASE}/station`;

export function listStation(query: StationApi.Query) {
  return requestClient.get<PageResult<StationApi.Station>>(`${BASE}/list`, {
    params: query,
  });
}

export function getStation(stationId: string) {
  return requestClient.get<StationApi.Station>(`${BASE}/${stationId}`);
}

export function addStation(data: StationApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateStation(data: StationApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeStation(stationIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${stationIds.join(',')}`);
}

export function exportStation(query: StationApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}
