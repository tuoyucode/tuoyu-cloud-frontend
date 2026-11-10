import type { PageQuery, PageResult } from '../types';
import type { MesApi } from './common';

import { exportExcel, requestClient } from '../request';
import { MES_BASE } from './common';

export namespace StockInApi {
  /** 完工入库单（MesStockInVo） */
  export interface StockIn {
    batchCode?: string;
    completeTime?: string;
    createTime?: string;
    locationId?: string;
    locationName?: string;
    materialCode?: string;
    materialId: string;
    materialName?: string;
    operatorUserId?: string;
    operatorUserName?: string;
    qty: number;
    remark?: string;
    stockInCode: string;
    stockInId: string;
    /** 单据状态（StockInStatus） */
    stockInStatus: string;
    unit?: string;
    warehouseId: string;
    warehouseName?: string;
    workorderCode?: string;
    workorderId: string;
  }

  /** 查询条件（MesStockInBo） */
  export interface Query extends PageQuery {
    stockInCode?: string;
    stockInStatus?: string;
    workorderCode?: string;
    workorderId?: string;
  }

  /** 新增的参数（MesStockInBo） */
  export interface Form {
    locationId?: string;
    qty: number;
    remark?: string;
    warehouseId: string;
    workorderId: string;
  }
}

const BASE = `${MES_BASE}/stock-in`;

export function listStockIn(query: StockInApi.Query) {
  return requestClient.get<PageResult<StockInApi.StockIn>>(`${BASE}/list`, {
    params: query,
  });
}

/** 导出（条件与列表相同，后端按数据权限与行数上限处理） */
export function exportStockIn(query: StockInApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}

export function getStockIn(stockInId: string) {
  return requestClient.get<StockInApi.StockIn>(`${BASE}/${stockInId}`);
}

export function getStockInLogs(stockInId: string) {
  return requestClient.get<MesApi.StatusLog[]>(`${BASE}/${stockInId}/logs`);
}

export function addStockIn(data: StockInApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function completeStockIn(stockInId: string) {
  return requestClient.post<null>(`${BASE}/${stockInId}/complete`);
}

export function cancelStockIn(stockInId: string) {
  return requestClient.post<null>(`${BASE}/${stockInId}/cancel`);
}
