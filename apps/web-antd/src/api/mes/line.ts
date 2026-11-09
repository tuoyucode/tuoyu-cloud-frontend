import type { PageQuery, PageResult } from '#/api/types';

import { exportExcel, requestClient } from '#/api/request';

import { MES_BASE } from './common';

export namespace LineApi {
  /** 产线（MesLineVo） */
  export interface Line {
    createTime?: string;
    /** 所属工厂：由车间带出 */
    factoryId?: string;
    factoryName?: string;
    lineCode: string;
    lineId: string;
    lineName: string;
    remark?: string;
    sortNo: number;
    /** 0 正常，1 停用 */
    status: string;
    workshopId: string;
    workshopName?: string;
  }

  /** 查询条件（MesLineBo） */
  export interface Query extends PageQuery {
    factoryId?: string;
    lineCode?: string;
    lineName?: string;
    status?: string;
    workshopId?: string;
  }

  /** 新增、修改的参数（MesLineBo） */
  export type Form = Omit<
    Line,
    'createTime' | 'factoryName' | 'lineId' | 'workshopName'
  > & {
    lineId?: string;
  };
}

const BASE = `${MES_BASE}/line`;

export function listLine(query: LineApi.Query) {
  return requestClient.get<PageResult<LineApi.Line>>(`${BASE}/list`, {
    params: query,
  });
}

export function getLine(lineId: string) {
  return requestClient.get<LineApi.Line>(`${BASE}/${lineId}`);
}

export function addLine(data: LineApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateLine(data: LineApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeLine(lineIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${lineIds.join(',')}`);
}

export function exportLine(query: LineApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}
