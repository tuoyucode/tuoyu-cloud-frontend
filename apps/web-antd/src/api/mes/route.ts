import type { PageQuery, PageResult } from '#/api/types';

import { exportExcel, requestClient } from '#/api/request';

import { MES_BASE } from './common';

export namespace RouteApi {
  /** 工艺路线工序（MesRouteOperationVo） */
  export interface Operation {
    /** 是否需要首检合格后才能批量报工（Y 是 N 否） */
    firstInspection?: string;
    operationCode: string;
    operationId?: string;
    operationName: string;
    remark?: string;
    /** 工序顺序（大于 0，按升序执行，不能重复） */
    seqNo: number;
    /** 单件标准工时（分钟） */
    standardMinutes?: number | string;
    /** 建议工位类型 */
    stationType?: string;
  }

  /** 工艺路线（MesRouteVo）；详情中带工序 */
  export interface Route {
    createTime?: string;
    /** 是否默认版本（Y 是 N 否） */
    isDefault: string;
    /** 产品 */
    materialCode?: string;
    materialId: string;
    materialName?: string;
    operations?: Operation[];
    remark?: string;
    routeCode: string;
    routeId: string;
    routeName: string;
    routeVersion: string;
    /** 0 正常，1 停用 */
    status: string;
  }

  /** 查询条件（MesRouteBo） */
  export interface Query extends PageQuery {
    isDefault?: string;
    materialId?: string;
    routeCode?: string;
    routeName?: string;
    status?: string;
  }

  /** 新增、修改的工序 */
  export type OperationForm = Omit<Operation, 'operationId'>;

  /** 新增、修改的参数（MesRouteBo）：表头与工序一起保存，工序整体覆盖 */
  export interface Form {
    isDefault?: string;
    materialId: string;
    operations: OperationForm[];
    remark?: string;
    routeCode: string;
    routeId?: string;
    routeName: string;
    routeVersion: string;
    status?: string;
  }
}

const BASE = `${MES_BASE}/route`;

export function listRoute(query: RouteApi.Query) {
  return requestClient.get<PageResult<RouteApi.Route>>(`${BASE}/list`, {
    params: query,
  });
}

export function getRoute(routeId: string) {
  return requestClient.get<RouteApi.Route>(`${BASE}/${routeId}`);
}

export function addRoute(data: RouteApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateRoute(data: RouteApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeRoute(routeIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${routeIds.join(',')}`);
}

export function exportRoute(query: RouteApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}
