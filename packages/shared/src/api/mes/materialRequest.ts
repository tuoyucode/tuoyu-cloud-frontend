import type { PageQuery, PageResult } from '../types';
import type { MesApi } from './common';

import { requestClient } from '../request';
import { MES_BASE } from './common';

export namespace MaterialRequestApi {
  /** 领退料明细（MesMaterialRequestItemVo） */
  export interface Item {
    actualQty: number;
    batchCode?: string;
    itemId: string;
    locationId?: string;
    locationName?: string;
    materialCode?: string;
    materialId: string;
    materialName?: string;
    /** 按物料清单计算的需求数量，手工新增的明细为空 */
    planQty?: number;
    remark?: string;
    requestId: string;
    requestQty: number;
    specification?: string;
    unit?: string;
  }

  /** 领退料单（MesMaterialRequestVo） */
  export interface Request {
    completeTime?: string;
    createTime?: string;
    /** 明细（只在详情中返回） */
    items?: Item[];
    operatorUserId?: string;
    operatorUserName?: string;
    productName?: string;
    remark?: string;
    requestCode: string;
    requestId: string;
    /** 单据状态（MaterialRequestStatus） */
    requestStatus: string;
    /** 类型（MaterialRequestType） */
    requestType: string;
    submitTime?: string;
    warehouseId: string;
    warehouseName?: string;
    workorderCode?: string;
    workorderId: string;
  }

  /** 查询条件（MesMaterialRequestBo） */
  export interface Query extends PageQuery {
    requestCode?: string;
    requestStatus?: string;
    requestType?: string;
    workorderCode?: string;
    workorderId?: string;
  }

  /** 新增、修改的明细（MesMaterialRequestItemBo） */
  export interface ItemForm {
    batchCode?: string;
    locationId?: string;
    materialId: string;
    remark?: string;
    requestQty: number;
  }

  /** 新增、修改的参数（MesMaterialRequestBo） */
  export interface Form {
    items: ItemForm[];
    remark?: string;
    requestId?: string;
    /** 只在新增时提交，新增后不能修改 */
    requestType?: string;
    warehouseId: string;
    workorderId: string;
  }

  /** 按物料清单生成领料单的参数 */
  export interface GenerateForm {
    warehouseId: string;
    workorderId: string;
  }

  /** 仓库完成时逐行填写的实发数量 */
  export interface CompleteItem {
    actualQty: number;
    batchCode?: string;
    itemId: string;
    locationId?: string;
  }
}

const BASE = `${MES_BASE}/material-request`;

export function listMaterialRequest(query: MaterialRequestApi.Query) {
  return requestClient.get<PageResult<MaterialRequestApi.Request>>(
    `${BASE}/list`,
    { params: query },
  );
}

export function getMaterialRequest(requestId: string) {
  return requestClient.get<MaterialRequestApi.Request>(`${BASE}/${requestId}`);
}

export function getMaterialRequestLogs(requestId: string) {
  return requestClient.get<MesApi.StatusLog[]>(`${BASE}/${requestId}/logs`);
}

export function addMaterialRequest(data: MaterialRequestApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateMaterialRequest(data: MaterialRequestApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeMaterialRequest(requestIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${requestIds.join(',')}`);
}

/** 按工单的物料清单生成领料单草稿，返回新单据的 ID */
export function generateMaterialRequest(data: MaterialRequestApi.GenerateForm) {
  return requestClient.post<string>(`${BASE}/generate`, data);
}

export function submitMaterialRequest(requestId: string) {
  return requestClient.post<null>(`${BASE}/${requestId}/submit`);
}

export function completeMaterialRequest(
  requestId: string,
  items: MaterialRequestApi.CompleteItem[],
) {
  return requestClient.post<null>(`${BASE}/${requestId}/complete`, { items });
}

export function cancelMaterialRequest(requestId: string) {
  return requestClient.post<null>(`${BASE}/${requestId}/cancel`);
}
