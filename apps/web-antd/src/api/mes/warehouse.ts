import type { PageQuery, PageResult } from '#/api/types';

import { exportExcel, requestClient } from '#/api/request';

import { MES_BASE } from './common';

export namespace WarehouseApi {
  /** 仓库（MesWarehouseVo） */
  export interface Warehouse {
    createTime?: string;
    factoryId: string;
    factoryName?: string;
    remark?: string;
    sortNo: number;
    /** 0 正常，1 停用 */
    status: string;
    warehouseCode: string;
    warehouseId: string;
    warehouseName: string;
    /** 仓库类型（WarehouseType） */
    warehouseType: string;
  }

  /** 查询条件（MesWarehouseBo） */
  export interface Query extends PageQuery {
    factoryId?: string;
    status?: string;
    warehouseCode?: string;
    warehouseName?: string;
    warehouseType?: string;
  }

  /** 新增、修改的参数（MesWarehouseBo） */
  export type Form = Omit<
    Warehouse,
    'createTime' | 'factoryName' | 'warehouseId'
  > & {
    warehouseId?: string;
  };
}

const BASE = `${MES_BASE}/warehouse`;

export function listWarehouse(query: WarehouseApi.Query) {
  return requestClient.get<PageResult<WarehouseApi.Warehouse>>(`${BASE}/list`, {
    params: query,
  });
}

export function getWarehouse(warehouseId: string) {
  return requestClient.get<WarehouseApi.Warehouse>(`${BASE}/${warehouseId}`);
}

export function addWarehouse(data: WarehouseApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateWarehouse(data: WarehouseApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeWarehouse(warehouseIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${warehouseIds.join(',')}`);
}

export function exportWarehouse(query: WarehouseApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}
