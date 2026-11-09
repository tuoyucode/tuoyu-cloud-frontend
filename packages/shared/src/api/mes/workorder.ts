import type { PageQuery, PageResult } from '../types';
import type { MesApi } from './common';
import type { OperationTaskApi } from './operationTask';

import { exportExcel, requestClient } from '../request';
import { MES_BASE } from './common';

export namespace WorkorderApi {
  /** 生产工单（MesWorkorderVo） */
  export interface Workorder {
    actualEndTime?: string;
    actualStartTime?: string;
    batchCode?: string;
    bomId?: string;
    /** 物料清单（编码 + 版本） */
    bomName?: string;
    completedQty: number;
    /** 完成率（百分数，保留两位小数） */
    completionRate?: number;
    createTime?: string;
    defectQty: number;
    factoryId: string;
    factoryName?: string;
    lineId?: string;
    lineName?: string;
    materialCode?: string;
    materialId: string;
    materialName?: string;
    planEndTime?: string;
    planQty: number;
    planStartTime?: string;
    priority: number;
    remark?: string;
    routeId: string;
    /** 工艺路线（名称 + 版本） */
    routeName?: string;
    sourceCode?: string;
    /** manual 手工创建，erp 外部系统 */
    sourceType: string;
    specification?: string;
    stockedQty: number;
    /** 工序任务（只在详情中返回） */
    tasks?: OperationTaskApi.Task[];
    unit?: string;
    workorderCode: string;
    workorderId: string;
    /** 工单状态（WorkorderStatus） */
    workorderStatus: string;
    workshopId: string;
    workshopName?: string;
  }

  /** 查询条件（MesWorkorderBo） */
  export interface Query extends PageQuery {
    /** 计划开始时间的起点（yyyy-MM-dd HH:mm:ss） */
    beginPlanStartTime?: string;
    endPlanStartTime?: string;
    materialId?: string;
    workorderCode?: string;
    /** 状态，多个用英文逗号分隔 */
    workorderStatus?: string;
    workshopId?: string;
  }

  /** 新增、修改的参数（MesWorkorderBo）；编号自动生成，工厂由车间带出 */
  export interface Form {
    bomId?: string;
    lineId?: string;
    materialId: string;
    planEndTime?: string;
    planQty: number;
    planStartTime?: string;
    priority?: number;
    remark?: string;
    routeId: string;
    sourceCode?: string;
    sourceType?: string;
    workorderId?: string;
    workshopId: string;
  }
}

const BASE = `${MES_BASE}/workorder`;

export function listWorkorder(query: WorkorderApi.Query) {
  return requestClient.get<PageResult<WorkorderApi.Workorder>>(`${BASE}/list`, {
    params: query,
  });
}

export function getWorkorder(workorderId: string) {
  return requestClient.get<WorkorderApi.Workorder>(`${BASE}/${workorderId}`);
}

export function getWorkorderLogs(workorderId: string) {
  return requestClient.get<MesApi.StatusLog[]>(`${BASE}/${workorderId}/logs`);
}

/**
 * 工单下拉选项：按编号或批次号模糊匹配，最多 50 条，新建的在前。
 * name 为产品名称，parentId 为产品 ID
 *
 * @param statuses 状态，多个用英文逗号分隔，例如 'released,in_progress'
 */
export function getWorkorderOptions(params?: {
  keyword?: string;
  statuses?: string;
}) {
  return requestClient.get<MesApi.Option[]>(`${BASE}/options`, { params });
}

export function addWorkorder(data: WorkorderApi.Form) {
  return requestClient.post<null>(BASE, data);
}

export function updateWorkorder(data: WorkorderApi.Form) {
  return requestClient.put<null>(BASE, data);
}

export function removeWorkorder(workorderIds: string[]) {
  return requestClient.delete<null>(`${BASE}/${workorderIds.join(',')}`);
}

export function exportWorkorder(query: WorkorderApi.Query, fileName: string) {
  return exportExcel(`${BASE}/export`, { ...query }, fileName);
}

/** 下达：草稿 → 已下达，生成批次号与工序任务 */
export function releaseWorkorder(workorderId: string) {
  return requestClient.post<null>(`${BASE}/${workorderId}/release`);
}

/** 暂停：原因必填 */
export function pauseWorkorder(workorderId: string, reason: string) {
  return requestClient.post<null>(`${BASE}/${workorderId}/pause`, { reason });
}

/** 恢复到暂停前的状态 */
export function resumeWorkorder(workorderId: string) {
  return requestClient.post<null>(`${BASE}/${workorderId}/resume`);
}

/** 完工：生产中 → 已完工 */
export function completeWorkorder(workorderId: string) {
  return requestClient.post<null>(`${BASE}/${workorderId}/complete`);
}

/** 关闭：已完工 → 已关闭，原因可选 */
export function closeWorkorder(workorderId: string, reason?: string) {
  return requestClient.post<null>(`${BASE}/${workorderId}/close`, { reason });
}

/** 取消：草稿、已下达且没有报工，原因必填 */
export function cancelWorkorder(workorderId: string, reason: string) {
  return requestClient.post<null>(`${BASE}/${workorderId}/cancel`, { reason });
}
