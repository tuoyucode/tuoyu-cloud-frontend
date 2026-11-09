import type { PageQuery, PageResult } from '../types';

import { exportExcel, requestClient } from '../request';
import { MES_BASE } from './common';

export namespace WorkshopApi {
  /** 车间（MesWorkshopVo） */
  export interface Workshop {
    createTime?: string;
    /** 对应的组织（部门） */
    deptId?: string;
    factoryId: string;
    /** 所属工厂名称 */
    factoryName?: string;
    manager?: string;
    remark?: string;
    sortNo: number;
    /** 0 正常，1 停用 */
    status: string;
    workshopCode: string;
    workshopId: string;
    workshopName: string;
  }

  /** 查询条件（MesWorkshopBo） */
  export interface Query extends PageQuery {
    factoryId?: string;
    status?: string;
    workshopCode?: string;
    workshopName?: string;
  }

  /** 新增、修改的参数（MesWorkshopBo） */
  export type Form = Omit<
    Workshop,
    'createTime' | 'factoryName' | 'workshopId'
  > & {
    workshopId?: string;
  };
}

const BASE = `${MES_BASE}/workshop`;

export function listWorkshop(query: WorkshopApi.Query) {
  return requestClient.get<PageResult<WorkshopApi.Workshop>>(`${BASE}/list`, {
    params: query,
  });
}

export function getWorkshop(workshopId: string) {
  return requestClient.get<WorkshopApi.Workshop>(`${BASE}/${workshopId}`);
}

export function addWorkshop(data: WorkshopApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateWorkshop(data: WorkshopApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeWorkshop(workshopIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${workshopIds.join(',')}`);
}

export function exportWorkshop(query: WorkshopApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}
