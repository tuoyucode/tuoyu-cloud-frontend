import type { PageQuery, PageResult } from '#/api/types';

import { exportExcel, requestClient } from '#/api/request';

import { MES_BASE } from './common';

export namespace BomApi {
  /** 物料清单明细（MesBomItemVo） */
  export interface Item {
    itemId?: string;
    /** 损耗率（0 ~ 1，0.05 表示 5%） */
    lossRate?: number | string;
    materialCode?: string;
    materialId: string;
    materialName?: string;
    /** 用量（对应表头的基准数量） */
    qty: number | string;
    remark?: string;
    sortNo?: number;
    specification?: string;
    unit?: string;
  }

  /** 物料清单（MesBomVo）；详情中带明细 */
  export interface Bom {
    /** 基准数量（明细用量对应的产品数量） */
    baseQty: number | string;
    bomCode: string;
    bomId: string;
    bomVersion: string;
    createTime?: string;
    /** 是否默认版本（Y 是 N 否） */
    isDefault: string;
    items?: Item[];
    /** 产品 */
    materialCode?: string;
    materialId: string;
    materialName?: string;
    remark?: string;
    /** 0 正常，1 停用 */
    status: string;
    unit?: string;
  }

  /** 查询条件（MesBomBo） */
  export interface Query extends PageQuery {
    bomCode?: string;
    bomVersion?: string;
    isDefault?: string;
    materialId?: string;
    status?: string;
  }

  /** 新增、修改的明细 */
  export type ItemForm = Pick<
    Item,
    'lossRate' | 'materialId' | 'qty' | 'remark' | 'sortNo'
  >;

  /** 新增、修改的参数（MesBomBo）：表头与明细一起保存，明细整体覆盖 */
  export interface Form {
    baseQty?: number | string;
    bomCode: string;
    bomId?: string;
    bomVersion: string;
    isDefault?: string;
    items: ItemForm[];
    materialId: string;
    remark?: string;
    status?: string;
  }
}

const BASE = `${MES_BASE}/bom`;

export function listBom(query: BomApi.Query) {
  return requestClient.get<PageResult<BomApi.Bom>>(`${BASE}/list`, {
    params: query,
  });
}

export function getBom(bomId: string) {
  return requestClient.get<BomApi.Bom>(`${BASE}/${bomId}`);
}

export function addBom(data: BomApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateBom(data: BomApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeBom(bomIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${bomIds.join(',')}`);
}

export function exportBom(query: BomApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}
