import type { PageQuery, PageResult } from '../types';
import type { MesApi } from './common';

import { exportExcel, requestClient, silentErrors } from '../request';
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
    /** 物料当前的追溯方式（none、batch、sn）；按批次追溯的物料完成时必须填写物料批次号 */
    traceMode?: string;
    unit?: string;
  }

  /** 领退料单（MesMaterialRequestVo） */
  export interface Request {
    /** 当前（最近一次）审批的业务 ID，用于查看审批记录与撤销审批；没有审批过时为空 */
    approvalBusinessId?: string;
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

/** 导出（条件与列表相同，后端按数据权限与行数上限处理） */
export function exportMaterialRequest(
  query: MaterialRequestApi.Query,
  fileName: string,
) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}

export function getMaterialRequest(requestId: string) {
  return requestClient.get<MaterialRequestApi.Request>(`${BASE}/${requestId}`);
}

/**
 * 审批中的单据（流程办理抽屉的“业务详情”）：流程参与人可以查看，不需要领退料单的查询权限。
 * 出错时不弹出提示（无权查看等原因由页签内显示）
 *
 * @param businessId 流程的业务 ID（单据主键，第二轮起带轮次后缀）
 */
export function getMaterialRequestForApproval(businessId: string) {
  return requestClient.get<MaterialRequestApi.Request>(
    `${BASE}/approval/${encodeURIComponent(businessId)}`,
    silentErrors({}),
  );
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

/**
 * 提交，返回提交后的状态：submitted 已提交；approving 已提交审批（开启补料审批时的补料单）
 */
export function submitMaterialRequest(requestId: string) {
  return requestClient.post<string>(`${BASE}/${requestId}/submit`);
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
