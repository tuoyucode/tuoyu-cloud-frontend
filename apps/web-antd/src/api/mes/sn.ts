import type { MesApi } from './common';

import type { PageQuery, PageResult } from '#/api/types';

import { exportExcel, requestClient } from '#/api/request';

import { MES_BASE } from './common';

export namespace SnApi {
  /** 产品序列号（MesSnVo） */
  export interface Sn {
    batchCode?: string;
    createTime?: string;
    materialCode?: string;
    materialId: string;
    materialName?: string;
    remark?: string;
    snCode: string;
    snId: string;
    /** 状态（SnStatus） */
    snStatus: string;
    workorderCode?: string;
    workorderId: string;
  }

  /** 查询条件（MesSnBo） */
  export interface Query extends PageQuery {
    snCode?: string;
    snStatus?: string;
    workorderCode?: string;
    workorderId?: string;
  }

  /** 批量生成（MesSnGenerateBo） */
  export interface Generate {
    count: number;
    workorderId: string;
  }
}

const BASE = `${MES_BASE}/sn`;

export function listSn(query: SnApi.Query) {
  return requestClient.get<PageResult<SnApi.Sn>>(`${BASE}/list`, {
    params: query,
  });
}

export function getSn(snId: string) {
  return requestClient.get<SnApi.Sn>(`${BASE}/${snId}`);
}

export function getSnLogs(snId: string) {
  return requestClient.get<MesApi.StatusLog[]>(`${BASE}/${snId}/logs`);
}

export function generateSn(data: SnApi.Generate) {
  return requestClient.post<null>(`${BASE}/generate`, data);
}

export function scrapSn(snId: string, reason: string) {
  return requestClient.post<null>(`${BASE}/${snId}/scrap`, { reason });
}

export function exportSn(query: SnApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}
